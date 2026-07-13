export type ExamMode = "MCQ" | "SAQ" | "THEORY";

export interface MCQCard {
  id: string;
  type: "MCQ";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category?: string;
}

export interface SAQCard {
  id: string;
  type: "SAQ";
  question: string;
  answer: string;
  category?: string;
}

export interface TheoryCard {
  id: string;
  type: "THEORY";
  question: string;
  answer: string;
  category?: string;
}

export type Flashcard = MCQCard | SAQCard | TheoryCard;

export type AppStep = "name" | "upload" | "mode" | "generating" | "deck";

export interface DeckMeta {
  sourceName: string;
  mode: ExamMode;
  studentName: string;
  createdAt: number;
}
