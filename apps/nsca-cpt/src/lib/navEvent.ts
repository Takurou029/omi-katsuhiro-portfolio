// ナビゲーション通知イベントとガード。
// クイズはページ内のローカルstateで動くため、同一URLへの Link クリックでは
// 何も起きない（Next.js は同一ルートへの遷移でstateをリセットしない）。
// ナビ（サイドバー/下部タブ）は handleNavClick を通し、
// 1) 実行中の模試などが登録した「ガード」に確認を求め（拒否なら遷移ごと中止）、
// 2) 許可されたらイベントを発火してクイズ側のセッションを終了させる。

export const NAV_RESET_EVENT = "nsca-cpt:nav";

type NavGuard = () => boolean;

let currentGuard: NavGuard | null = null;

/**
 * ナビゲーションのガードを登録する（模試の採点前など、離脱確認が必要な画面用）。
 * 戻り値の関数で解除する。false を返すと遷移がキャンセルされる。
 */
export function setNavGuard(guard: NavGuard): () => void {
  currentGuard = guard;
  return () => {
    if (currentGuard === guard) currentGuard = null;
  };
}

/** ナビの Link の onClick に渡すハンドラ。 */
export function handleNavClick(e: { preventDefault: () => void }): void {
  if (currentGuard && !currentGuard()) {
    // ガードが拒否：遷移もセッション破棄も行わない。
    e.preventDefault();
    return;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAV_RESET_EVENT));
  }
}
