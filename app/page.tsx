"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import BackgroundScene from "@/components/BackgroundScene";
import NameGate from "@/components/NameGate";
import UploadStep from "@/components/UploadStep";
import ModeSelect from "@/components/ModeSelect";
import GeneratingLoader from "@/components/GeneratingLoader";
import FlashcardDeck from "@/components/FlashcardDeck";
import { AppStep, ExamMode, Flashcard } from "@/lib/types";

const NAME_KEY = "flashforge_name";

export default function Home() {
  const [step, setStep] = useState<AppStep>("name");
  const [name, setName] = useState("");
  const [slideText, setSlideText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ExamMode | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(NAME_KEY) : null;
    if (saved) {
      setName(saved);
      setStep("upload");
    }
    setHydrated(true);
  }, []);

  const handleName = (n: string) => {
    setName(n);
    localStorage.setItem(NAME_KEY, n);
    setStep("upload");
  };

  const handleExtracted = (text: string, fname: string) => {
    setSlideText(text);
    setFileName(fname);
    setStep("mode");
  };

  const handleMode = async (m: ExamMode) => {
    setMode(m);
    setStep("generating");
    setGenError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slideText, mode: m, studentName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong generating your deck.");
      setCards(data.cards);
      setStep("deck");
    } catch (err: any) {
      setGenError(err.message || "Something went wrong. Try again.");
      setStep("mode");
    }
  };

  const startNewDeck = () => {
    setSlideText("");
    setFileName("");
    setMode(null);
    setCards([]);
    setGenError(null);
    setStep("upload");
  };

  if (!hydrated) return <div className="min-h-screen bg-bg" />;

  return (
    <main className="relative min-h-screen">
      <BackgroundScene />
      <AnimatePresence mode="wait">
        {step === "name" && <NameGate key="name" onSubmit={handleName} />}

        {step === "upload" && (
          <UploadStep
            key="upload"
            name={name}
            onExtracted={handleExtracted}
            onBack={() => setStep("name")}
          />
        )}

        {step === "mode" && (
          <div key="mode" className="flex flex-col items-center">
            <ModeSelect
              name={name}
              fileName={fileName}
              onConfirm={handleMode}
              onBack={() => setStep("upload")}
            />
            {genError && (
              <p className="text-coral text-sm -mt-4 mb-8 text-center max-w-md px-6">{genError}</p>
            )}
          </div>
        )}

        {step === "generating" && mode && (
          <GeneratingLoader key="generating" name={name} mode={mode} />
        )}

        {step === "deck" && mode && (
          <FlashcardDeck
            key="deck"
            name={name}
            mode={mode}
            fileName={fileName}
            cards={cards}
            onNewDeck={startNewDeck}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
