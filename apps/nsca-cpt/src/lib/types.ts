// アプリ全体で共有する型定義。

/** questions.json の1問を表す型（データモデルは仕様に準拠）。 */
export interface QuestionReference {
  edition: string;
  chapter: string | null;
  page: number | null;
}

export interface Question {
  id: string;
  /** 分野名（日本語）。DOMAINS の name と一致する。 */
  domain: string;
  /** 難易度 1〜3。 */
  difficulty: 1 | 2 | 3;
  question: string;
  /** 3択（将来的に選択肢数の変更にも耐えられるよう配列で保持）。 */
  choices: string[];
  answerIndex: number;
  explanation: string;
  imageUrl: string | null;
  videoUrl: string | null;
  reference: QuestionReference;
}

/** 出題モード。 */
export type StudyMode = "practice" | "mock" | "daily" | "review";

/** 1回の解答記録（統計・振り返りの元データ）。 */
export interface AnswerRecord {
  questionId: string;
  domain: string;
  correct: boolean;
  chosenIndex: number;
  /** epoch ミリ秒。 */
  timestamp: number;
  mode: StudyMode;
}

/** Leitner 方式の1問あたりの状態。 */
export interface LeitnerCard {
  questionId: string;
  /** ボックス番号（1 が最頻出＝苦手、大きいほど定着）。 */
  box: number;
  correctCount: number;
  wrongCount: number;
  /** 最後に出題した epoch ミリ秒。0 は未出題。 */
  lastSeen: number;
  /** 直近の正誤。未出題は null。 */
  lastCorrect: boolean | null;
}

/** 連続学習日数（ストリーク）の状態。 */
export interface StreakState {
  current: number;
  longest: number;
  /** 最後に学習した日（ローカル YYYY-MM-DD）。未学習は null。 */
  lastStudyDate: string | null;
  /**
   * ストリーク保護（おやすみ）の残り回数。
   * 1日だけ休んでも消費してチェーンを繋ぐ。7日継続ごとに1回付与（上限あり）。
   */
  freezes: number;
}

export type ThemePreference = "system" | "light" | "dark";

/** ユーザー設定。 */
export interface Settings {
  /** 試験日（YYYY-MM-DD）。未設定は null。 */
  examDate: string | null;
  /** 1日の最低ノルマ（「今日の◯問」）。 */
  dailyGoal: number;
  theme: ThemePreference;
  /** リマインダー（.ics）を作成済みか（ホームでの提案表示の判定に使う）。 */
  reminderConfigured?: boolean;
  /** ホームのリマインダー提案を「あとで」で閉じたか。 */
  reminderPromptDismissed?: boolean;
}

/** localStorage / 将来のDBに保存する進捗の全体像。 */
export interface ProgressState {
  /** マイグレーション用スキーマバージョン。 */
  version: number;
  answers: AnswerRecord[];
  /** questionId をキーとした Leitner カード。 */
  cards: Record<string, LeitnerCard>;
  streak: StreakState;
  settings: Settings;
  /** 初期化日時（ISO 文字列）。 */
  createdAt: string;
}
