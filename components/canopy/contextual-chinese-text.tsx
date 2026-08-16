"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Lookup = {
  entryId: string;
  text: string;
  pinyin: string;
  definitions: string[];
  card?: { id: string; phoneticReading: string[]; definitions: string[] };
};

export function ContextualChineseText({ text }: { text: string }) {
  const [entries, setEntries] = useState<Lookup[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  useEffect(() => {
    if (!text.match(/\p{Script=Han}/u)) return;
    void fetch("/api/dictionary/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (response) =>
        response.ok ? response.json() : { entries: [] },
      )
      .then((payload: { entries: Lookup[] }) => setEntries(payload.entries))
      .catch(() => setEntries([]));
  }, [text]);
  const byText = useMemo(
    () => new Map(entries.map((entry) => [entry.text, entry])),
    [entries],
  );
  const pattern = useMemo(
    () =>
      entries.length
        ? new RegExp(
            `(${entries
              .map((entry) => entry.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .sort((a, b) => b.length - a.length)
              .join("|")})`,
            "g",
          )
        : null,
    [entries],
  );
  if (!pattern) return <>{text}</>;
  return (
    <>
      {text.split(pattern).map((part, index) => {
        const entry = byText.get(part);
        if (!entry) return part;
        const reading = entry.card?.phoneticReading.join(" ") ?? entry.pinyin;
        const definitions = entry.card?.definitions ?? entry.definitions;
        return (
          <Tooltip key={`${part}-${index}`}>
            <TooltipTrigger asChild>
              <button
                className="rounded bg-primary/15 px-0.5 text-inherit underline decoration-primary/50 underline-offset-4"
                type="button"
              >
                {part}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">
                {part}
                {entry.card ? " · In your collection" : ""}
              </p>
              <p>{reading}</p>
              <p>{definitions.join("; ")}</p>
              {!entry.card && !added.includes(entry.entryId) ? (
                <Button
                  className="mt-2 h-7"
                  onClick={async () => {
                    const response = await fetch("/api/dictionary/cards", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ entryId: entry.entryId }),
                    });
                    if (response.ok)
                      setAdded((current) => [...current, entry.entryId]);
                  }}
                  size="sm"
                  type="button"
                >
                  Add to collection
                </Button>
              ) : null}
              {added.includes(entry.entryId) ? (
                <p className="mt-1 font-semibold text-primary">
                  Added to collection
                </p>
              ) : null}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
