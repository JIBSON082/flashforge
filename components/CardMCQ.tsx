"use client";

import { useState } from "react";
import { MCQCard } from "@/lib/types";
import { Check, X, ArrowRight } from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

export default function CardMCQ({
  card,
  onAnswered,
  onNext,
}: {
  card: MCQCard;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  const choose = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    onAnswered(idx === card.correctIndex);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full max-w-xl rounded-3xl bg-surface border border-line shadow-card p-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-mint">
              Multiple Choice
            </span>
            {card.category && (
              <span className="font-mono text-[10px] tracking-wide text-text-faint border border-line rounded-full px-2.5 py-1">
                {card.category}
              </span>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-display font-medium leading-snug mt-3">
            {card.question}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {card.options.map((opt, idx) => {
            const isCorrect = idx === card.correctIndex;
            const isPicked = idx === picked;
            const revealed = picked !== null;

            let stateClasses = "border-line hover:border-violet/60 hover:bg-raised";
            if (revealed && isCorrect) stateClasses = "border-mint bg-mint/10";
            else if (revealed && isPicked && !isCorrect) stateClasses = "border-coral bg-coral/10";
            else if (revealed) stateClasses = "border-line opacity-50";

            return (
              <button
                key={idx}
                onClick={() => choose(idx)}
                disabled={revealed}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${stateClasses}`}
              >
                <span className="h-7 w-7 shrink-0 rounded-lg bg-bg flex items-center justify-center font-mono text-xs text-text-muted">
                  {LETTERS[idx]}
                </span>
                <span className="text-sm sm:text-base flex-1">{opt}</span>
                {revealed && isCorrect && <Check size={18} className="text-mint shrink-0" />}
                {revealed && isPicked && !isCorrect && <X size={18} className="text-coral shrink-0" />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="rounded-2xl bg-bg border border-line/60 px-4 py-3.5">
            <p className="text-sm text-text-muted leading-relaxed">
              <span className="text-text font-medium">
                {picked === card.correctIndex ? "Correct — " : "Not quite — "}
              </span>
              {card.explanation}
            </p>
          </div>
        )}
      </div>

      {picked !== null ? (
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-full bg-accent text-ink px-6 py-3 font-display font-semibold hover:shadow-glow transition-all active:scale-[0.98]"
        >
          Next card <ArrowRight size={16} />
        </button>
      ) : (
        <div className="h-[46px]" />
      )}
    </div>
  );
}
