// 解説用のオリジナル図解（SVG）。
// Web上の画像の直リンクは著作権・オフラインPWAの観点で行わず、
// 学習ポイントを要約した自作のスキーマ図を問題IDに紐づけて表示する。

import type { ReactNode } from "react";

/** 図の共通ラッパー。 */
function Fig({
  children,
  caption,
  viewBox = "0 0 320 150",
}: {
  children: ReactNode;
  caption: string;
  viewBox?: string;
}) {
  return (
    <figure className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <svg
        viewBox={viewBox}
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={caption}
      >
        {children}
      </svg>
      <figcaption className="mt-1.5 text-center text-[11px] text-slate-400">
        {caption}（学習用の概念図）
      </figcaption>
    </figure>
  );
}

const INK = "currentColor";
const GOOD = "#16a34a";
const BAD = "#e11d48";
const ACCENT = "#65a30d";

/** スクワットの深さ：大腿が床と平行 */
function SquatDepth() {
  return (
    <Fig caption="スクワットの深さの目安：大腿上面が床と平行かそれ以下">
      {/* 床 */}
      <line x1="20" y1="130" x2="300" y2="130" stroke={INK} strokeWidth="2" />
      {/* 平行ライン（点線） */}
      <line x1="30" y1="82" x2="200" y2="82" stroke={GOOD} strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="205" y="86" fontSize="11" fill={GOOD} fontWeight="bold">大腿が床と平行</text>
      {/* 人（側面のスティックフィギュア・パラレルスクワット） */}
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
        {/* 脛：足首(90,130)→膝(105,82) */}
        <line x1="92" y1="130" x2="106" y2="84" />
        {/* 大腿：膝(105,82)→股関節(60,82) 床と平行 */}
        <line x1="106" y1="84" x2="62" y2="82" />
        {/* 体幹：股関節(60,82)→肩(72,38) 前傾を保つ */}
        <line x1="62" y1="82" x2="76" y2="40" />
        {/* 腕：肩→前方（バー保持を単純化） */}
        <line x1="76" y1="42" x2="112" y2="50" />
      </g>
      {/* 頭 */}
      <circle cx="80" cy="28" r="9" fill="none" stroke={INK} strokeWidth="3.5" />
      {/* バー（背中の上） */}
      <circle cx="70" cy="44" r="6" fill={ACCENT} />
      {/* 足 */}
      <line x1="84" y1="130" x2="102" y2="130" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      {/* 深さ矢印 */}
      <g stroke={INK} strokeWidth="1.5">
        <line x1="255" y1="82" x2="255" y2="130" />
        <line x1="250" y1="87" x2="255" y2="82" />
        <line x1="260" y1="87" x2="255" y2="82" />
      </g>
      <text x="262" y="110" fontSize="10" fill={INK} opacity="0.7">可動域が</text>
      <text x="262" y="122" fontSize="10" fill={INK} opacity="0.7">許す範囲で</text>
    </Fig>
  );
}

/** 脊柱ニュートラル vs 丸まり */
function NeutralSpine() {
  return (
    <Fig caption="デッドリフト：脊柱はニュートラル（左）。腰の丸まり（右）は避ける">
      {/* 左：良い例 */}
      <g>
        <text x="55" y="18" fontSize="12" fill={GOOD} fontWeight="bold" textAnchor="middle">ニュートラル</text>
        <line x1="15" y1="130" x2="140" y2="130" stroke={INK} strokeWidth="2" />
        <g stroke={GOOD} strokeWidth="4" strokeLinecap="round" fill="none">
          {/* 背中：まっすぐ（股関節→肩） */}
          <line x1="45" y1="95" x2="85" y2="45" />
          {/* 大腿・脛 */}
          <line x1="45" y1="95" x2="65" y2="112" />
          <line x1="65" y1="112" x2="60" y2="130" />
          {/* 腕：肩からバーへ垂直 */}
          <line x1="85" y1="47" x2="88" y2="118" stroke={INK} strokeWidth="3" />
        </g>
        <circle cx="90" cy="34" r="8" fill="none" stroke={GOOD} strokeWidth="3.5" />
        {/* バー */}
        <circle cx="88" cy="122" r="7" fill={ACCENT} />
        <text x="55" y="145" fontSize="11" fill={GOOD} textAnchor="middle" fontWeight="bold">OK</text>
      </g>
      {/* 右：悪い例 */}
      <g>
        <text x="245" y="18" fontSize="12" fill={BAD} fontWeight="bold" textAnchor="middle">腰が丸まる</text>
        <line x1="180" y1="130" x2="305" y2="130" stroke={INK} strokeWidth="2" />
        <g stroke={BAD} strokeWidth="4" strokeLinecap="round" fill="none">
          {/* 背中：丸い曲線 */}
          <path d="M215 95 Q230 45 258 42" />
          <line x1="215" y1="95" x2="235" y2="112" />
          <line x1="235" y1="112" x2="230" y2="130" />
          <line x1="256" y1="44" x2="258" y2="118" stroke={INK} strokeWidth="3" />
        </g>
        <circle cx="264" cy="34" r="8" fill="none" stroke={BAD} strokeWidth="3.5" />
        <circle cx="258" cy="122" r="7" fill={ACCENT} />
        <text x="245" y="145" fontSize="11" fill={BAD} textAnchor="middle" fontWeight="bold">NG</text>
      </g>
    </Fig>
  );
}

/** ベンチプレス：肩甲骨の内転・下制 */
function Scapula() {
  return (
    <Fig caption="ベンチプレス：肩甲骨を寄せて（内転）下げる（下制）ことで肩を守る">
      {/* 背面から見た単純な背中 */}
      <rect x="100" y="25" width="120" height="105" rx="18" fill="none" stroke={INK} strokeWidth="2.5" />
      <text x="160" y="18" fontSize="11" fill={INK} opacity="0.7" textAnchor="middle">背面から見た図</text>
      {/* 左右の肩甲骨 */}
      <path d="M125 45 l22 10 v30 l-22 8 Z" fill="#a3e635" opacity="0.7" stroke={ACCENT} strokeWidth="2" />
      <path d="M195 45 l-22 10 v30 l22 8 Z" fill="#a3e635" opacity="0.7" stroke={ACCENT} strokeWidth="2" />
      {/* 内転の矢印（中央へ） */}
      <g stroke={GOOD} strokeWidth="2.5" fill="none">
        <line x1="118" y1="68" x2="138" y2="68" />
        <path d="M133 63 l6 5 -6 5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="202" y1="68" x2="182" y2="68" />
        <path d="M187 63 l-6 5 6 5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* 下制の矢印（下へ） */}
      <g stroke={GOOD} strokeWidth="2.5" fill="none">
        <line x1="136" y1="96" x2="136" y2="116" />
        <path d="M131 111 l5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="184" y1="96" x2="184" y2="116" />
        <path d="M179 111 l5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="250" y="70" fontSize="11" fill={GOOD} fontWeight="bold">寄せる</text>
      <text x="250" y="112" fontSize="11" fill={GOOD} fontWeight="bold">下げる</text>
    </Fig>
  );
}

/** 膝のアライメント：つま先方向 / ニーイン */
function KneeAlignment() {
  return (
    <Fig caption="着地・ランジの膝：つま先の方向へ（左）。内側への崩れ＝ニーイン（右）は避ける">
      {/* 左：OK 正面から見た脚 */}
      <g>
        <text x="80" y="18" fontSize="12" fill={GOOD} fontWeight="bold" textAnchor="middle">OK</text>
        <g stroke={GOOD} strokeWidth="5" strokeLinecap="round" fill="none">
          <line x1="60" y1="35" x2="60" y2="80" />
          <line x1="60" y1="80" x2="60" y2="122" />
          <line x1="100" y1="35" x2="100" y2="80" />
          <line x1="100" y1="80" x2="100" y2="122" />
        </g>
        {/* 膝 */}
        <circle cx="60" cy="80" r="7" fill={GOOD} />
        <circle cx="100" cy="80" r="7" fill={GOOD} />
        {/* 足（つま先やや外） */}
        <line x1="55" y1="126" x2="42" y2="132" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <line x1="105" y1="126" x2="118" y2="132" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* 右：NG ニーイン */}
      <g>
        <text x="240" y="18" fontSize="12" fill={BAD} fontWeight="bold" textAnchor="middle">NG（ニーイン）</text>
        <g stroke={BAD} strokeWidth="5" strokeLinecap="round" fill="none">
          <line x1="215" y1="35" x2="232" y2="80" />
          <line x1="232" y1="80" x2="220" y2="122" />
          <line x1="265" y1="35" x2="248" y2="80" />
          <line x1="248" y1="80" x2="260" y2="122" />
        </g>
        <circle cx="232" cy="80" r="7" fill={BAD} />
        <circle cx="248" cy="80" r="7" fill={BAD} />
        <line x1="215" y1="126" x2="202" y2="132" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <line x1="265" y1="126" x2="278" y2="132" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {/* 内側へ崩れる矢印 */}
        <g stroke={BAD} strokeWidth="2" fill="none">
          <path d="M212 62 q10 8 16 14" strokeDasharray="3 3" />
          <path d="M268 62 q-10 8 -16 14" strokeDasharray="3 3" />
        </g>
      </g>
    </Fig>
  );
}

/** 負荷と反復回数の連続体（筋力・筋肥大・筋持久力） */
function LoadRepContinuum() {
  return (
    <Fig caption="負荷と反復回数の関係：目的によってゾーンが変わる" viewBox="0 0 320 160">
      {/* 軸 */}
      <line x1="35" y1="120" x2="300" y2="120" stroke={INK} strokeWidth="2" />
      <line x1="35" y1="120" x2="35" y2="20" stroke={INK} strokeWidth="2" />
      <text x="160" y="152" fontSize="11" fill={INK} opacity="0.7" textAnchor="middle">反復回数（レップ）</text>
      <text x="18" y="70" fontSize="11" fill={INK} opacity="0.7" textAnchor="middle" transform="rotate(-90 18 70)">負荷（%1RM）</text>
      {/* 斜めの帯（負荷が高いほど低レップ） */}
      <polygon points="40,25 90,25 300,105 300,115 40,45" fill="#94a3b8" opacity="0.25" />
      {/* ゾーン（ラベルが軸や図外に食い込まないよう幅を確保する） */}
      <rect x="45" y="28" width="112" height="20" rx="4" fill="#f87171" opacity="0.9" />
      <text x="101" y="42" fontSize="10" fill="#fff" fontWeight="bold" textAnchor="middle">筋力 ≥85% ×1〜6</text>
      <rect x="110" y="55" width="128" height="20" rx="4" fill="#a3e635" opacity="0.95" />
      <text x="174" y="69" fontSize="10" fill="#1a2e05" fontWeight="bold" textAnchor="middle">筋肥大 67〜85% ×6〜12</text>
      <rect x="185" y="85" width="125" height="20" rx="4" fill="#38bdf8" opacity="0.9" />
      <text x="247" y="99" fontSize="10" fill="#082f49" fontWeight="bold" textAnchor="middle">筋持久力 軽負荷 ×15+</text>
      {/* 軸メモリ */}
      <text x="45" y="134" fontSize="9" fill={INK} opacity="0.6">1</text>
      <text x="160" y="134" fontSize="9" fill={INK} opacity="0.6">10</text>
      <text x="290" y="134" fontSize="9" fill={INK} opacity="0.6">20+</text>
    </Fig>
  );
}

/** セット間休息の目安 */
function RestPeriods() {
  return (
    <Fig caption="目的別のセット間休息の目安" viewBox="0 0 320 140">
      {[
        { label: "筋力・パワー（高強度）", min: "2〜5分", w: 250, color: "#f87171" },
        { label: "筋肥大（中強度）", min: "30秒〜1.5分", w: 140, color: "#a3e635" },
        { label: "筋持久力（低強度）", min: "〜30秒", w: 70, color: "#38bdf8" },
      ].map((r, i) => (
        <g key={r.label} transform={`translate(0 ${14 + i * 40})`}>
          <text x="10" y="10" fontSize="11" fill={INK} fontWeight="bold">{r.label}</text>
          <rect x="10" y="16" width={r.w} height="14" rx="7" fill={r.color} opacity="0.85" />
          <text x={r.w + 16} y="27" fontSize="11" fill={INK} opacity="0.8">{r.min}</text>
        </g>
      ))}
    </Fig>
  );
}

/** BMI の計算式 */
function BmiFormula() {
  return (
    <Fig caption="BMI の計算式" viewBox="0 0 320 120">
      <text x="55" y="66" fontSize="20" fontWeight="bold" fill={INK}>BMI =</text>
      {/* 分数 */}
      <text x="185" y="48" fontSize="16" fontWeight="bold" fill={ACCENT} textAnchor="middle">体重 (kg)</text>
      <line x1="120" y1="58" x2="250" y2="58" stroke={INK} strokeWidth="2" />
      <text x="185" y="82" fontSize="16" fontWeight="bold" fill={INK} textAnchor="middle">身長 (m)²</text>
      <text x="185" y="108" fontSize="10" fill={INK} opacity="0.6" textAnchor="middle">例：70kg ÷ (1.75m)² ≒ 22.9</text>
    </Fig>
  );
}

/** 血圧の分類（概算） */
function BloodPressure() {
  return (
    <Fig caption="安静時血圧の目安（指針により異なる・要公式確認）" viewBox="0 0 320 130">
      {[
        { label: "正常", range: "120/80未満", color: "#4ade80", y: 14 },
        { label: "上昇〜高値", range: "120〜129 / 80未満", color: "#facc15", y: 52 },
        { label: "高血圧", range: "130以上 / 80以上", color: "#f87171", y: 90 },
      ].map((r) => (
        <g key={r.label} transform={`translate(0 ${r.y})`}>
          <rect x="10" y="0" width="90" height="26" rx="6" fill={r.color} opacity="0.9" />
          <text x="55" y="17" fontSize="12" fontWeight="bold" fill="#1e293b" textAnchor="middle">{r.label}</text>
          <text x="112" y="17" fontSize="12" fill={INK} opacity="0.85">{r.range} mmHg</text>
        </g>
      ))}
    </Fig>
  );
}

/** 問題ID → 図解のマッピング。 */
const MAP: Record<string, () => ReactNode> = {
  "tech-001": SquatDepth,
  "tech-002": NeutralSpine,
  "tech-005": NeutralSpine,
  "tech-003": Scapula,
  "tech-008": KneeAlignment,
  "tech-009": KneeAlignment,
  "prog-001": LoadRepContinuum,
  "prog-002": LoadRepContinuum,
  "prog-010": LoadRepContinuum,
  "prog-006": RestPeriods,
  "consult-003": BmiFormula,
  "consult-008": BloodPressure,
};

/** 問題に対応する図解があれば返す。無ければ null。 */
export function getIllustration(questionId: string): ReactNode | null {
  const Component = MAP[questionId];
  return Component ? <Component /> : null;
}
