// 出題比率・合格ライン・試験日など、あとから変更しやすい定数をまとめる。
// 注意：ここの数値は概算・学習用の設定値。最新の公式情報で必ず確認すること。

import type { Settings } from "./types";

export type DomainId = "consultation" | "technique" | "program" | "safety";

export interface Domain {
  id: DomainId;
  /** questions.json の domain と一致する日本語名。 */
  name: string;
  /** UI で短く表示する名前。 */
  shortName: string;
  /** 模試での出題比率（概算・設定変更可。合計 ≒ 1.0）。 */
  mockWeight: number;
  /** メーター等で使うアクセント色（Tailwind の任意色）。 */
  color: string;
}

/**
 * 分野定義。mockWeight は本番配点の概算：
 * エクササイズテクニック ≒31% / プログラムデザイン ≒31% /
 * 面談と評価 ≒25% / 安全性・法的 ≒13%
 */
export const DOMAINS: Domain[] = [
  {
    id: "consultation",
    name: "面談と評価",
    shortName: "面談・評価",
    mockWeight: 0.25,
    color: "#38bdf8",
  },
  {
    id: "technique",
    name: "エクササイズテクニック",
    shortName: "テクニック",
    mockWeight: 0.31,
    color: "#a3e635",
  },
  {
    id: "program",
    name: "プログラムデザイン",
    shortName: "プログラム",
    mockWeight: 0.31,
    color: "#fb923c",
  },
  {
    id: "safety",
    name: "安全性・法的",
    shortName: "安全・法的",
    mockWeight: 0.13,
    color: "#f472b6",
  },
];

export const DOMAIN_BY_NAME: Record<string, Domain> = Object.fromEntries(
  DOMAINS.map((d) => [d.name, d]),
);

/** 分野名の配列（出題比率の入力に使う）。 */
export const DOMAIN_WEIGHTS: Record<string, number> = Object.fromEntries(
  DOMAINS.map((d) => [d.name, d.mockWeight]),
);

/** 本番試験の概算（設定変更可）。155問・180分（3時間）。 */
export const REAL_EXAM = {
  questions: 155,
  minutes: 180,
} as const;

/** 合格ライン（正答率）。概算・要公式確認。 */
export const PASS_RATE = 0.7;

/** Leitner 方式のボックス数。 */
export const NUM_BOXES = 5;

/** 模試のデフォルト問題数。 */
export const DEFAULT_MOCK_QUESTIONS = 30;

/** 「今日の◯問」の既定ノルマ。 */
export const DEFAULT_DAILY_GOAL = 3;

/** 設定の初期値。試験日は今日から約90日後を仮設定（設定画面で変更可）。 */
export function defaultSettings(today: Date = new Date()): Settings {
  const exam = new Date(today);
  exam.setDate(exam.getDate() + 90);
  const yyyy = exam.getFullYear();
  const mm = String(exam.getMonth() + 1).padStart(2, "0");
  const dd = String(exam.getDate()).padStart(2, "0");
  return {
    examDate: `${yyyy}-${mm}-${dd}`,
    dailyGoal: DEFAULT_DAILY_GOAL,
    theme: "system",
  };
}
