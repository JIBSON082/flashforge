"use client";

import { useState } from "react";
import { SAQCard, TheoryCard } from "@/lib/types";
import { RotateCcw, Check, RefreshCw } from "lucide-react";

export default function CardOpen({
  card,
  onRate,
}: {
  card: SAQCard | TheoryCard;
  onRate: (knewIt: boolean) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const isTheory = card.type === "THEORY";

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="perspective w-full max-w-xl h-80 sm:h-72">
        <div
          className="relative w-full h-full preserve-3d transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
        >
          {/* front */}
          <div className="absolute inset-0 backface-hidden rounded-3xl bg-surface border border-line shadow-card p-8 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-violet-soft">
                {isTheory ? "Theory" : "Short Answer"} · Question
              </span>
              {card.category && (
                <span className="font-mono text-[10px] tracking-wide text-text-faint border border-line rounded-full px-2.5 py-1 shrink-0">
                  {card.category}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center text-center px-2">
              <p className="text-xl sm:text-2xl font-display font-medium leading-snug">
                {card.question}
              </p>
            </div>
            <span className="text-center text-text-faint text-xs flex items-center justify-center gap-1.5">
              <RotateCcw size={12} /> Tap card to reveal answer
            </span>
          </div>

          {/* back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-raised border border-accent/40 shadow-card p-8 flex flex-col overflow-y-auto">
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent">
              Model Answer
            </span>
            <div className="flex-1 flex items-center py-3">
              <p className="text-base sm:text-lg leading-relaxed text-text">{card.answer}</p>
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => onRate(false)}
            className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-text-muted hover:border-coral hover:text-coral transition-colors"
          >
            <RefreshCw size={14} /> Review again
          </button>
          <button
            onClick={() => onRate(true)}
            className="flex items-center gap-2 rounded-full bg-mint text-ink px-5 py-2.5 text-sm font-semibold hover:shadow-glow transition-all active:scale-[0.98]"
          >
            <Check size={14} /> Got it
          </button>
        </div>
      ) : (
        <div className="h-[42px]" />
      )}
    </div>
  );
}
