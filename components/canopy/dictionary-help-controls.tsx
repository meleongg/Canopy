"use client";

import type { Dispatch, SetStateAction } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DictionaryHelpDensity } from "@/lib/dictionary-help";
import { cn } from "@/lib/utils";

export type { DictionaryHelpDensity } from "@/lib/dictionary-help";

export function DictionaryHelpControls({
  enabled,
  setEnabled,
  density,
  setDensity,
}: {
  enabled: boolean;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  density: DictionaryHelpDensity;
  setDensity: Dispatch<SetStateAction<DictionaryHelpDensity>>;
}) {
  const description = !enabled
    ? "Selected vocabulary stays marked; turn this on for other useful phrases."
    : density === "helpful"
      ? "Helpful phrases marks the first occurrence of each discovered phrase."
      : "All matches marks every discovered phrase.";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Button
        aria-pressed={enabled}
        onClick={() => setEnabled((current) => !current)}
        type="button"
        variant="outline"
      >
        <BookOpen />
        Dictionary help: {enabled ? "On" : "Off"}
      </Button>
      {enabled ? (
        <div
          aria-label="Dictionary highlight density"
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="group"
        >
          {(
            [
              ["helpful", "Helpful phrases"],
              ["all", "All matches"],
            ] as const
          ).map(([value, label]) => (
            <Button
              aria-pressed={density === value}
              className={cn("h-8", density === value && "bg-primary")}
              key={value}
              onClick={() => setDensity(value)}
              size="sm"
              type="button"
              variant={density === value ? "default" : "ghost"}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
