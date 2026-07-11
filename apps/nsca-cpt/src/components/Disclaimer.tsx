// 免責・注意書き。仕様どおりアプリ内に明記する。
import { AlertIcon } from "./icons";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="px-4 py-3 text-center text-[11px] leading-relaxed text-slate-400">
        本アプリの問題はオリジナルの学習用であり、公式問題の再現ではありません。
        最終確認は公式テキスト第3版で行ってください。
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="mb-1 flex items-center gap-1.5 font-bold">
        <AlertIcon className="h-4 w-4 flex-none" />
        ご利用にあたっての注意
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          収録問題は<strong>オリジナルの学習用</strong>であり、
          公式問題の再現ではありません。
        </li>
        <li>
          最終確認は必ず<strong>公式テキスト（第3版）</strong>で行ってください。
        </li>
        <li>
          出題比率・合格ライン（70%）・試験日は<strong>設定値（概算）</strong>です。
          最新の公式情報で必ずご確認ください。
        </li>
      </ul>
    </div>
  );
}
