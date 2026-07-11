// 保存層の抽象化。
// UI やロジックは StorageProvider インターフェースにのみ依存させ、
// 実装（localStorage / 将来のDB）を差し替え可能にする。

import type { ProgressState } from "../types";

export interface StorageProvider {
  /** 保存済みの進捗を読み込む。無ければ null。 */
  load(): Promise<ProgressState | null>;
  /** 進捗を丸ごと保存する。 */
  save(state: ProgressState): Promise<void>;
  /** 進捗を全消去する。 */
  clear(): Promise<void>;
}

/** 現在のスキーマバージョン。 */
export const SCHEMA_VERSION = 2;
