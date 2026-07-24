import json
import pandas as pd

COLS = ["ファイル","ページ","提出者氏名","所属","役職",
"SP4課 皐月ふうさん","SP2課 目良文香さん",
"CH4課 山中奈羽さん/CH3課 柏山美夕凪さん",
"ディレクター 松本花朱美さん/湯川希実子さん",
"山本展生先生","羽森綱平理事",
"印象に残った講演者","理由(印象に残った講演者)",
"次回講演してほしい方","理由(次回講演)","満足度","感想"]

# 課の並び順（原本の課ごと・ページ順）
ORDER = ["CH1課","CH2課","CH3課","CH4課","CH5課",
         "2部CH1課","SP2課","SP3課","SP4課","SP5課","SP6課"]

rows = []
for line in open("result.jsonl", encoding="utf-8"):
    if line.strip():
        rows.append(json.loads(line))

def sortkey(r):
    f = r["ファイル"]
    return (ORDER.index(f) if f in ORDER else 99, r["ページ"])

rows.sort(key=sortkey)

# 17列を固定、_要確認があれば末尾列として追加
extra = "_要確認"
has_extra = any(extra in r for r in rows)
cols = COLS + ([extra] if has_extra else [])

data = []
for r in rows:
    data.append({c: r.get(c, "") for c in cols})

df = pd.DataFrame(data, columns=cols)
df.to_excel("output.xlsx", index=False, sheet_name="アンケート集計")
print("wrote output.xlsx:", df.shape)
print(df[["ファイル","ページ","提出者氏名","満足度"]].to_string())
