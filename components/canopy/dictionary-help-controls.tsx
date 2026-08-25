"use client";

import type { Dispatch, SetStateAction } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DictionaryHelpControls({
  enabled,
  setEnabled,
  variant = "full",
  showDescription,
}: {
  enabled: boolean;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  variant?: "full" | "compact";
  showDescription?: boolean;
}) {
  const description = !enabled
    ? "Off: read without dictionary highlights."
    : "Focused help marks seed words and the first occurrence of each discovered phrase, including words in your replies.";
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
          {variant === "compact" ? "Dictionary" : "Focused help"}: {enabled ? "On" : "Off"}
        </Button>
      </div>
      {shouldShowDescription ? (
        <p className="w-full text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
