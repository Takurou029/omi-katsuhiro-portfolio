"""参考_既存集計.xlsx の該当行(画像照合済み)を result.jsonl へ追記する。
usage: python3 refload.py <ファイル> <ページ>"""
import sys, json, subprocess
import openpyxl

fname, page = sys.argv[1], int(sys.argv[2])
wb = openpyxl.load_workbook("参考_既存集計.xlsx", data_only=True)
ws = wb["アンケート集計"]
rows = list(ws.iter_rows(values_only=True))
hdr = rows[1]
for r in rows[2:]:
    d = dict(zip(hdr, r))
    if d.get("ファイル") == fname and d.get("ページ") == page:
        p = subprocess.run(["python3", "append.py"],
                           input=json.dumps(d, ensure_ascii=False),
                           capture_output=True, text=True)
        print(p.stdout.strip() or p.stderr.strip())
        sys.exit(p.returncode)
sys.exit(f"not found in reference: {fname} p{page}")
