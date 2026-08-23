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
  variant = "full",
  showDescription,
}: {
  enabled: boolean;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  density: DictionaryHelpDensity;
  setDensity: Dispatch<SetStateAction<DictionaryHelpDensity>>;
  variant?: "full" | "compact";
  showDescription?: boolean;
}) {
  const description = !enabled
    ? "Off: read without dictionary highlights."
    : density === "helpful"
      ? "Helpful phrases marks the first occurrence of each discovered phrase."
      : "All matches marks every discovered phrase.";
  const shouldShowDescription = showDescription ?? variant === "full";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        variant === "compact"
          ? "gap-2"
          : "mt-3 gap-3 rounded-lg border border-border bg-card p-3",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-pressed={enabled}
          aria-label={description}
          onClick={() => setEnabled((current) => !current)}
          title={description}
          type="button"
          variant="outline"
        >
          <BookOpen />
          {variant === "compact" ? "Dictionary" : "Dictionary help"}: {enabled ? "On" : "Off"}
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
                {variant === "compact"
                  ? value === "helpful"
                    ? "Helpful"
                    : "All"
                  : label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      {shouldShowDescription ? (
        <p className="w-full text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
