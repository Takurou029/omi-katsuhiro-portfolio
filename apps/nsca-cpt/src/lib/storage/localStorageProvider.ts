// localStorage を用いた StorageProvider の実装。
// 将来 DB 化する場合は、この 3 メソッドを持つ別実装を用意して差し替えるだけでよい。

import type { ProgressState } from "../types";
import { SCHEMA_VERSION, type StorageProvider } from "./provider";

const STORAGE_KEY = "nsca-cpt-progress-v1";

export class LocalStorageProvider implements StorageProvider {
  private key: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  async load(): Promise<ProgressState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProgressState;
      return migrate(parsed);
    } catch (e) {
      // 破損データは無視して初期化に委ねる。
      console.warn("進捗データの読み込みに失敗しました。初期化します。", e);
      return null;
    }
  }

  async save(state: ProgressState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) {
      console.warn("進捗データの保存に失敗しました。", e);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(this.key);
  }
}

/** 旧バージョンのデータを現行スキーマへ移行する。 */
function migrate(state: ProgressState): ProgressState {
  if (!state || typeof state !== "object") return state;
  let next = state;
  // v1 -> v2: 既定テーマを「端末に従う」から「ライト」へ変更。
  // ユーザーが明示的に選んだ dark / light はそのまま尊重する。
  if ((next.version ?? 1) < 2 && next.settings?.theme === "system") {
    next = { ...next, settings: { ...next.settings, theme: "light" } };
  }
  return { ...next, version: SCHEMA_VERSION };
}
