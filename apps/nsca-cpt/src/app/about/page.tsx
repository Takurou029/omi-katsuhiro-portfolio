import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata = {
  title: "このアプリについて | NSCA-CPT 試験対策",
};

export default function AboutPage() {
  return (
    <div className="animate-pop-in mx-auto w-full max-w-2xl">
      <PageHeader title="このアプリについて" />
      <div className="space-y-4 px-4">
        <Disclaimer />

        <Card>
          <h2 className="text-sm font-bold">使い方の流れ</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>まずは「今日の◯問」で毎日の習慣をつくる。</li>
            <li>練習モードで分野を絞って弱点を潰す（苦手ほど高頻度で再出題）。</li>
            <li>誤答は自動で「間違いノート」に蓄積。ここだけ復習できる。</li>
            <li>仕上げに模試モードで本番形式（制限時間・採点）に挑戦。</li>
          </ol>
        </Card>

        <Card>
          <h2 className="text-sm font-bold">弱点優先の仕組み（Leitner 方式）</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            問題ごとに正誤を記録し、5つのボックスで管理します。正解すると
            1つ上のボックスへ（出題頻度が下がる）、不正解だとボックス1へ戻り
            （最も高頻度で再出題）。これにより、間違えた問題ほど繰り返し出題され、
            効率よく定着します。
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold">模試の出題比率</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            公式の出題内容概要（採点対象140問の内訳：面談と評価32問／プログラム
            デザイン45問／エクササイズテクニック43問／安全性・法的20問）に基づく
            比率で出題します。制限時間は本番（155問・180分）を問題数に応じて
            比例配分し、合格ラインは70%（設定値）です。
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold">収録問題と試験範囲</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            全200問を、公式の出題比率に沿って4分野・22のサブ分野に配分して収録
            しています。どの範囲がまだ手つかずかは「統計・振り返り」の
            「試験範囲のカバレッジ」で確認でき、練習モードではサブ分野を指定して
            集中的に潰すこともできます。
          </p>
        </Card>

        <div className="pb-4 text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-slate-200 px-6 py-3 font-bold dark:bg-slate-800"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
