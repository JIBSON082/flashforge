"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flashcard, ExamMode } from "@/lib/types";
import CardMCQ from "./CardMCQ";
import CardOpen from "./CardOpen";
import { ChevronLeft, ChevronRight, Shuffle, Plus, Trophy, RotateCcw } from "lucide-react";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardDeck({
  name,
  mode,
  fileName,
  cards,
  onNewDeck,
}: {
  name: string;
  mode: ExamMode;
  fileName: string;
  cards: Flashcard[];
  onNewDeck: () => void;
}) {
  const [activeCards, setActiveCards] = useState(cards);
  const [order, setOrder] = useState<number[]>(() => activeCards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const total = activeCards.length;
  const current = activeCards[order[pos]];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, order, finished]);

  const goNext = () => {
    if (pos + 1 >= total) {
      setFinished(true);
    } else {
      setPos((p) => p + 1);
    }
  };
  const goPrev = () => setPos((p) => Math.max(0, p - 1));

  const shuffleDeck = () => {
    setOrder(shuffleArray(activeCards.map((_, i) => i)));
    setPos(0);
    setResults({});
    setFinished(false);
  };

  const restartSame = () => {
    setPos(0);
    setResults({});
    setFinished(false);
  };

  const reviewMissedOnly = () => {
    const missed = activeCards.filter((c) => results[c.id] === false);
    if (missed.length === 0) return;
    setActiveCards(missed);
    setOrder(missed.map((_, i) => i));
    setPos(0);
    setResults({});
    setFinished(false);
  };

  const record = (id: string, ok: boolean) => setResults((r) => ({ ...r, [id]: ok }));

  const missedCount = useMemo(
    () => Object.values(results).filter((v) => v === false).length,
    [results]
  );
  const correctCount = useMemo(
    () => Object.values(results).filter((v) => v === true).length,
    [results]
  );

  if (finished) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl bg-surface border border-line shadow-card p-10 flex flex-col items-center text-center gap-5"
        >
          <div className="h-14 w-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
            <Trophy size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold">
              Nice work, {name}.
            </h2>
            <p className="text-text-muted text-sm mt-1.5">
              You went through {total} {mode === "MCQ" ? "questions" : "cards"} from {fileName}.
            </p>
          </div>

          <div className="flex gap-4 w-full">
            <div className="flex-1 rounded-2xl bg-bg border border-line py-4">
              <p className="text-2xl font-display font-semibold text-mint">{correctCount}</p>
              <p className="text-text-faint text-xs mt-1">{mode === "MCQ" ? "Correct" : "Got it"}</p>
            </div>
            <div className="flex-1 rounded-2xl bg-bg border border-line py-4">
              <p className="text-2xl font-display font-semibold text-coral">{missedCount}</p>
              <p className="text-text-faint text-xs mt-1">{mode === "MCQ" ? "Missed" : "To review"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full mt-2">
            {missedCount > 0 && (
              <button
                onClick={reviewMissedOnly}
                className="flex items-center justify-center gap-2 rounded-full bg-accent text-ink font-display font-semibold py-3 hover:shadow-glow transition-all active:scale-[0.98]"
              >
                <RotateCcw size={16} /> Review the {missedCount} I missed
              </button>
            )}
            <button
              onClick={restartSame}
              className="flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-medium hover:border-violet/60 transition-colors"
            >
              <Shuffle size={14} /> Study this deck again
            </button>
            <button
              onClick={onNewDeck}
              className="flex items-center justify-center gap-2 rounded-full text-text-muted hover:text-text py-2 text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Start a new deck
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-xl flex items-center justify-between mb-8">
        <div>
          <p className="font-display font-semibold leading-none">{name}&apos;s deck</p>
          <p className="text-text-faint text-xs mt-1 font-mono">{mode} · {fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={shuffleDeck}
            className="h-9 w-9 rounded-full border border-line flex items-center justify-center text-text-muted hover:border-violet/60 hover:text-text transition-colors"
            aria-label="Shuffle deck"
          >
            <Shuffle size={15} />
          </button>
          <button
            onClick={onNewDeck}
            className="h-9 w-9 rounded-full border border-line flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-colors"
            aria-label="New deck"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between text-xs font-mono text-text-faint mb-2">
          <span>Card {pos + 1} of {total}</span>
          <span>{Math.round(((pos + 1) / total) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((pos + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center"
          >
            {current.type === "MCQ" ? (
              <CardMCQ
                card={current}
                onAnswered={(correct) => record(current.id, correct)}
                onNext={goNext}
              />
            ) : (
              <CardOpen
                card={current}
                onRate={(knewIt) => {
                  record(current.id, knewIt);
                  goNext();
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 mt-10">
        <button
          onClick={goPrev}
          disabled={pos === 0}
          className="h-10 w-10 rounded-full border border-line flex items-center justify-center text-text-muted disabled:opacity-30 hover:border-violet/60 hover:text-text transition-colors"
          aria-label="Previous card"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-text-faint text-xs font-mono w-16 text-center">
          {pos + 1} / {total}
        </span>
        <button
          onClick={goNext}
          className="h-10 w-10 rounded-full border border-line flex items-center justify-center text-text-muted hover:border-violet/60 hover:text-text transition-colors"
          aria-label="Next card"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

