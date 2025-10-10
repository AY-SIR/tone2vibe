import React from "react";
import { Compare } from "@/components/ui/compare";

export function CompareDemo() {
  return (
    <div className="p-2 border rounded-3xl dark:bg-neutral-900 bg-neutral-100  border-neutral-200 dark:border-neutral-800 px-4">
      <Compare
firstImage="/Supported5.png"
        secondImage="/Supported3.png"
        firstImageClassName="object-cover object-left-top"
        secondImageClassname="object-cover object-left-top"
        className="h-[250px] w-[350px] md:h-[500px] md:w-[750px]"
        slideMode="hover"
      />

 </div>
  );
}
