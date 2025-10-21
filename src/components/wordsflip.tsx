
import React from "react";
import { FlipWords } from "@/components/ui/flip-words";
import {
  Mic,} from "lucide-react";
export function WordsFlip() {
  const words = ["lively", "bright", "vivid"];

  return (
    <section className="flex justify-center items-center px-0 py-6 ">
      <div className="max-w-5xl w-full">
        <h1 className="sm:text-center font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-700 dark:text-gray-700 leading-tight">
          <span className="block mb-2">
            Make your words{" "}
            <span className="inline-block">

              <FlipWords words={words} />
            </span>
          </span>
        <span className="inline-flex items-center gap-4">
  With
  <Mic className="h-8 w-8 text-black" />
</span>


        </h1>
      </div>
    </section>
  );
}
