#!/usr/bin/env python3
"""
claude-bridge.py  — SSE bridge between Claude Code and サクラStudio
Usage:
  python3 claude-bridge.py          # runs on port 3001
  python3 claude-bridge.py 3001     # explicit port

Claude sends events via:
  curl -s -X POST http://localhost:3001/event \
       -H 'Content-Type: application/json' \
       -d '{"type":"thinking","msg":"分析中..."}' &>/dev/null

Supported types: idle | thinking | coding | reading | searching | bash | responding
"""
import http.server, json, queue, threading, sys, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
_clients: list[queue.Queue] = []
_lock = threading.Lock()

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

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
                # Send heartbeat every 15s to keep connection alive
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
            self.wfile.write(json.dumps({'clients': n}).encode())
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
            dead = []
            with _lock:
                for q in _clients:
                    try:
                        q.put_nowait(payload)
                    except queue.Full:
                        dead.append(q)
                for q in dead:
                    _clients.remove(q)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self._cors()
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Bridge)
    print(f"[claude-bridge] listening on http://localhost:{PORT}")
    print(f"  GET  /stream  — SSE endpoint (browser connects here)")
    print(f"  POST /event   — push event from Claude Code")
    print(f"  GET  /status  — connection count")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[claude-bridge] stopped")
