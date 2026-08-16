"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PRACTICE_SOURCES, type PracticeSource } from "@/lib/practice";

export function PracticeSourcePicker({ source }: { source: PracticeSource }) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState(source);
  const [, startTransition] = useTransition();

  function selectSource(nextSource: PracticeSource) {
    if (nextSource === selectedSource) return;

    setSelectedSource(nextSource);
    startTransition(() => {
      router.replace(`/practice?source=${nextSource}`, { scroll: false });
    });
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup">
      {PRACTICE_SOURCES.map((option) => {
        const isSelected = selectedSource === option.value;

        return (
          <button
            aria-checked={isSelected}
            className={`relative min-h-28 rounded-lg border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isSelected
                ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/25"
                : "border-border bg-background hover:border-primary/60"
            }`}
            key={option.value}
            onClick={() => selectSource(option.value)}
            role="radio"
            type="button"
          >
            {isSelected ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                <Check aria-hidden="true" className="size-3" /> Selected
              </span>
            ) : null}
            <p className="pr-20 font-semibold">{option.label}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
