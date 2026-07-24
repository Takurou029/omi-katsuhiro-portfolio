import sys, json, os

REQUIRED = ["ファイル","ページ","提出者氏名","所属","役職",
"SP4課 皐月ふうさん","SP2課 目良文香さん",
"CH4課 山中奈羽さん/CH3課 柏山美夕凪さん",
"ディレクター 松本花朱美さん/湯川希実子さん",
"山本展生先生","羽森綱平理事",
"印象に残った講演者","理由(印象に残った講演者)",
"次回講演してほしい方","理由(次回講演)","満足度","感想"]

data = json.loads(sys.stdin.read())
missing = [k for k in REQUIRED if k not in data]
if missing:
    sys.exit(f"missing keys: {missing}")
extra = [k for k in data if k not in REQUIRED and k != "_要確認"]
if extra:
    sys.exit(f"unexpected keys: {extra}")
out = {k: ("" if data[k] is None else data[k]) for k in REQUIRED}
if "_要確認" in data:
    out["_要確認"] = data["_要確認"]

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "result.jsonl")
if os.path.exists(path):
    for line in open(path, encoding="utf-8"):
        if not line.strip():
            continue
        r = json.loads(line)
        if r["ファイル"] == out["ファイル"] and r["ページ"] == out["ページ"]:
            print(f"SKIP existing {out['ファイル']} p{out['ページ']}")
            sys.exit(0)
with open(path, "a", encoding="utf-8") as f:
    f.write(json.dumps(out, ensure_ascii=False) + "\n")
print(f"OK {out['ファイル']} p{out['ページ']}")
