// src/components/WordsFlip.tsx (or wherever this file is)

import React from "react";
import { FlipWords } from "@/components/ui/flip-words";

export function WordsFlip() {
  const words = ["lively", "bright", "vivid"];

  return (
    <section className="flex justify-center items-center px-4 py-8 mb-6">
      <div className="max-w-5xl w-full">
        <h1 className="text-left sm:text-center font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-700 dark:text-gray-100 leading-tight">
          <span className="block mb-2">
            Make your words{" "}
            <span className="inline-block">

              <FlipWords words={words} />
            </span>
          </span>
          <span className="block">with Tone2Vibe  . . . . .</span>
        </h1>
      </div>
    </section>
  );
}