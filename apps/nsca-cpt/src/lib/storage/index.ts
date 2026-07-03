// 保存層のエントリポイント。ここでアプリが使う実装を1か所で決める。
// 将来 Supabase などに切り替える場合はここを差し替える。

import { LocalStorageProvider } from "./localStorageProvider";
import type { StorageProvider } from "./provider";

export { SCHEMA_VERSION } from "./provider";
export type { StorageProvider } from "./provider";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider();
  }
  return provider;
}

/** テストや将来のDI用に、実装を差し替えるためのフック。 */
export function setStorageProvider(p: StorageProvider): void {
  provider = p;
}
