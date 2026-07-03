"use client";

// アプリの進捗状態を管理する React コンテキスト。
// 状態は StorageProvider（既定は localStorage）で永続化する。
// ロジック（Leitner・ストリーク）は純粋関数に委譲し、ここでは配線のみ行う。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { defaultSettings } from "./config";
import { applyAnswer, createCard } from "./leitner";
import { toDateKey, updateStreak } from "./streak";
import { getStorageProvider, SCHEMA_VERSION } from "./storage";
import type {
  AnswerRecord,
  ProgressState,
  Question,
  Settings,
  StudyMode,
} from "./types";

export function createInitialState(now: Date = new Date()): ProgressState {
  return {
    version: SCHEMA_VERSION,
    answers: [],
    cards: {},
    streak: { current: 0, longest: 0, lastStudyDate: null },
    settings: defaultSettings(now),
    createdAt: now.toISOString(),
  };
}

type Action =
  | {
      type: "RECORD_ANSWER";
      question: Question;
      chosenIndex: number;
      mode: StudyMode;
      now: number;
    }
  | { type: "UPDATE_SETTINGS"; settings: Partial<Settings> }
  | { type: "HYDRATE"; state: ProgressState }
  | { type: "RESET" };

export function reducer(state: ProgressState, action: Action): ProgressState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "RESET":
      return createInitialState();

    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case "RECORD_ANSWER": {
      const { question, chosenIndex, mode, now } = action;
      const correct = chosenIndex === question.answerIndex;

      const record: AnswerRecord = {
        questionId: question.id,
        domain: question.domain,
        correct,
        chosenIndex,
        timestamp: now,
        mode,
      };

      const existing = state.cards[question.id] ?? createCard(question.id);
      const nextCard = applyAnswer(existing, correct, now);

      const nextStreak = updateStreak(state.streak, toDateKey(new Date(now)));

      return {
        ...state,
        answers: [...state.answers, record],
        cards: { ...state.cards, [question.id]: nextCard },
        streak: nextStreak,
      };
    }

    default:
      return state;
  }
}

interface StoreContextValue {
  state: ProgressState;
  hydrated: boolean;
  recordAnswer: (
    question: Question,
    chosenIndex: number,
    mode: StudyMode,
  ) => boolean;
  updateSettings: (settings: Partial<Settings>) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  );
  const [hydrated, setHydrated] = useState(false);

  // 初回マウント時に保存済みデータを読み込む。
  useEffect(() => {
    let active = true;
    const provider = getStorageProvider();
    provider.load().then((loaded) => {
      if (!active) return;
      if (loaded) dispatch({ type: "HYDRATE", state: loaded });
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // 状態変化のたびに永続化する（ハイドレート完了後のみ）。
  useEffect(() => {
    if (!hydrated) return;
    getStorageProvider().save(state);
  }, [state, hydrated]);

  const recordAnswer = useCallback(
    (question: Question, chosenIndex: number, mode: StudyMode) => {
      dispatch({
        type: "RECORD_ANSWER",
        question,
        chosenIndex,
        mode,
        now: Date.now(),
      });
      return chosenIndex === question.answerIndex;
    },
    [],
  );

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({ state, hydrated, recordAnswer, updateSettings, resetAll }),
    [state, hydrated, recordAnswer, updateSettings, resetAll],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useProgress(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useProgress は ProgressProvider の内側で使用してください。");
  }
  return ctx;
}
