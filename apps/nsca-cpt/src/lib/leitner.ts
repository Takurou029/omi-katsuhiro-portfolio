// 弱点優先の出題ロジック（Leitner 方式）。
// フレームワーク非依存の純粋関数として実装し、単体テスト可能にする。

import { NUM_BOXES } from "./config";
import type { LeitnerCard, Question } from "./types";

/** 乱数生成器（テストで差し替え可能にするため注入可能にする）。 */
export type Rng = () => number;

/** 未出題の問題に新しいカードを作る。 */
export function createCard(questionId: string): LeitnerCard {
  return {
    questionId,
    box: 1,
    correctCount: 0,
    wrongCount: 0,
    lastSeen: 0,
    lastCorrect: null,
  };
}

/**
 * 解答結果をカードに反映する（純粋関数：新しいカードを返す）。
 * - 正解：ボックスを1つ上げる（最大 NUM_BOXES）＝出題頻度が下がる
 * - 不正解：ボックス1に戻す＝最頻出（苦手として集中復習）
 */
export function applyAnswer(
  card: LeitnerCard,
  correct: boolean,
  now: number,
): LeitnerCard {
  const box = correct
    ? Math.min(NUM_BOXES, card.box + 1)
    : 1;
  return {
    ...card,
    box,
    correctCount: card.correctCount + (correct ? 1 : 0),
    wrongCount: card.wrongCount + (correct ? 0 : 1),
    lastSeen: now,
    lastCorrect: correct,
  };
}

/**
 * 出題の重み。ボックスが低い（苦手）ほど大きく、未出題は高めに設定して
 * 新しい問題も導入されるようにする。
 */
export function selectionWeight(card: LeitnerCard | undefined): number {
  if (!card || card.lastSeen === 0) {
    // 未出題：box1 相当の高い優先度で導入する。
    return NUM_BOXES;
  }
  // box1 -> NUM_BOXES, box NUM_BOXES -> 1
  return Math.max(1, NUM_BOXES + 1 - card.box);
}

/**
 * 重み付きで count 問を非復元抽出する。
 * 苦手（低ボックス）・未出題ほど選ばれやすい。
 * rng を注入することで決定的なテストが可能。
 */
export function selectQuestions(
  questions: Question[],
  cards: Record<string, LeitnerCard>,
  count: number,
  rng: Rng = Math.random,
): Question[] {
  const pool = questions.map((q) => ({
    q,
    weight: selectionWeight(cards[q.id]),
  }));

  const selected: Question[] = [];
  const target = Math.min(count, pool.length);

  for (let i = 0; i < target; i++) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) break;
    let r = rng() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r < 0) {
        idx = j;
        break;
      }
      idx = j;
    }
    selected.push(pool[idx].q);
    pool.splice(idx, 1); // 非復元
  }

  return selected;
}

/**
 * 苦手優先で並べ替えた問題リストを返す（決定的。抽選ではなく順序）。
 * 重みが同じ場合は最後に見た時刻が古い順、次に id 順で安定ソート。
 */
export function orderByPriority(
  questions: Question[],
  cards: Record<string, LeitnerCard>,
): Question[] {
  return [...questions].sort((a, b) => {
    const wa = selectionWeight(cards[a.id]);
    const wb = selectionWeight(cards[b.id]);
    if (wb !== wa) return wb - wa; // 重み大（苦手）を先に
    const la = cards[a.id]?.lastSeen ?? 0;
    const lb = cards[b.id]?.lastSeen ?? 0;
    if (la !== lb) return la - lb; // 古いものを先に
    return a.id.localeCompare(b.id);
  });
}

/** 「間違いノート」対象：直近で誤答した（box1 かつ lastCorrect===false）問題ID。 */
export function wrongNoteIds(cards: Record<string, LeitnerCard>): string[] {
  return Object.values(cards)
    .filter((c) => c.lastCorrect === false)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((c) => c.questionId);
}
