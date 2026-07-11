"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function StepShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16"
    >
      {children}
    </motion.div>
  );
}

