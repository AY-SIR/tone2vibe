// components/GridPattern.tsx
import React from "react";

export const GridPattern: React.FC<{
  rows?: number;
  columns?: number;
  cellSize?: number;
}> = ({ rows = 11, columns = 41, cellSize = 40 }) => {
  return (
    <div className="flex shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105 bg-gray-100">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              style={{ width: cellSize, height: cellSize }}
              className={`flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50"
                  : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
};
