#!/usr/bin/env python3
"""
claude-bridge.py  — SSE bridge between Claude Code and サクラStudio
Usage:
  python3 claude-bridge.py          # runs on port 3001

Two ways Claude can push state updates:
  A) Local (Claude Code running locally):
     curl -s -X POST http://localhost:3001/event \
          -H 'Content-Type: application/json' \
          -d '{"type":"coding","msg":"editing..."}' &>/dev/null

  B) Remote (Claude Code on the web → GitHub as relay):
     Claude updates claude-state.json via GitHub API.
     This server polls via git fetch every 3 seconds.

Supported types: idle | thinking | coding | reading | searching | bash | responding
"""
import http.server, json, queue, threading, sys, time, subprocess, os

PORT      = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
REPO_DIR  = os.path.dirname(os.path.abspath(__file__))
BRANCH    = 'claude/threads-post-analysis-6vy3k7'
STATE_FILE = 'claude-state.json'

_clients: list[queue.Queue] = []
_lock = threading.Lock()

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

# ─── broadcast to all connected SSE clients ───────────────────────────────
def broadcast(payload: str):
    with _lock:
        dead = []
        for q in _clients:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _clients.remove(q)

# ─── git-fetch polling (GitHub relay mode) ────────────────────────────────
_last_state_sha: str | None = None

def poll_git_state():
    global _last_state_sha
    print(f"[claude-bridge] git-poll started (branch: {BRANCH}, interval: 3s)", flush=True)
    while True:
        try:
            # Fetch latest remote refs (quiet, fast for small repos)
            subprocess.run(
                ['git', 'fetch', '--quiet', 'origin', BRANCH],
                cwd=REPO_DIR, capture_output=True, timeout=15
            )
            # Read blob SHA for change detection (cheap)
            sha_result = subprocess.run(
                ['git', 'rev-parse', f'origin/{BRANCH}:{STATE_FILE}'],
                cwd=REPO_DIR, capture_output=True, text=True, timeout=5
            )
            if sha_result.returncode != 0:
                time.sleep(3)
                continue
            sha = sha_result.stdout.strip()
            if sha != _last_state_sha:
                _last_state_sha = sha
                # Read file content from remote ref (no working-tree changes)
                cat_result = subprocess.run(
                    ['git', 'show', f'origin/{BRANCH}:{STATE_FILE}'],
                    cwd=REPO_DIR, capture_output=True, text=True, timeout=5
                )
                if cat_result.returncode == 0:
                    content = cat_result.stdout.strip()
                    try:
                        data = json.loads(content)
                        print(f"[claude-bridge] state → {data.get('type','?')} : {data.get('msg','')}", flush=True)
                        broadcast(content)
                    except json.JSONDecodeError:
                        pass
        except Exception as e:
            pass  # network hiccup; retry next cycle
        time.sleep(3)

# ─── HTTP handler ──────────────────────────────────────────────────────────
class Bridge(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_): pass

    def _cors(self):
        for k, v in CORS.items():
            self.send_header(k, v)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Accel-Buffering', 'no')
            self._cors()
            self.end_headers()
            q: queue.Queue = queue.Queue()
            with _lock:
                _clients.append(q)
            try:
                self.wfile.write(b": heartbeat\n\n")
                self.wfile.flush()
                while True:
                    try:
                        msg = q.get(timeout=15)
                        self.wfile.write(f"data: {msg}\n\n".encode())
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": heartbeat\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with _lock:
                    if q in _clients:
                        _clients.remove(q)

        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors()
            self.end_headers()
            with _lock:
                n = len(_clients)
            self.wfile.write(json.dumps({'clients': n, 'last_sha': _last_state_sha}).encode())

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/event':
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode(errors='replace')
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {'type': 'idle', 'msg': raw}
            payload = json.dumps(data, ensure_ascii=False)
            print(f"[claude-bridge] POST event → {data.get('type','?')}", flush=True)
            broadcast(payload)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self._cors()
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

# ─── entrypoint ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Start git-fetch polling thread
    t = threading.Thread(target=poll_git_state, daemon=True)
    t.start()

    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Bridge)
    print(f"[claude-bridge] listening on http://localhost:{PORT}")
    print(f"  GET  /stream  — SSE (browser connects here)")
    print(f"  POST /event   — push state from local Claude Code")
    print(f"  GET  /status  — connection count + last sha")
    print(f"  [git-poll] watching origin/{BRANCH}:{STATE_FILE}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[claude-bridge] stopped")
