"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Sparkles } from "lucide-react";
import { SeedPicker } from "@/components/canopy/seed-picker";
import { fetchCards, streamTextResponse } from "@/components/canopy/card-utils";
import type { WorkspaceCard } from "@/components/canopy/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/query-keys";

function tokenizeStory(story: string, seeds: WorkspaceCard[]) {
  if (!story) {
    return null;
  }

  const terms = seeds
    .map((seed) => seed.targetText)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!terms.length) {
    return story;
  }

  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );

  return story.split(pattern).map((part, index) => {
    const seed = seeds.find((candidate) => candidate.targetText === part);
    if (!seed) {
      return part;
    }

    return (
      <Tooltip key={`${part}-${index}`}>
        <TooltipTrigger asChild>
          <mark className="rounded bg-[var(--paprika)] px-1 text-[var(--paprika-foreground)]">
            {part}
          </mark>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{seed.targetText}</p>
          <p>{seed.phoneticReading.join(" ")}</p>
          <p>{seed.definitions.join("; ")}</p>
        </TooltipContent>
      </Tooltip>
    );
  });
}

export function OverstoryView({
  initialCards,
}: {
  initialCards: WorkspaceCard[];
}) {
  const { data: cards = initialCards } = useQuery({
    queryKey: queryKeys.overstorySeeds,
    queryFn: fetchCards,
    initialData: initialCards,
  });
  const [seedIds, setSeedIds] = useState<string[]>(
    cards.slice(0, 3).map((card) => card.id),
  );
  const [story, setStory] = useState("");
  const [isPending, startTransition] = useTransition();
  const seedCards = useMemo(
    () => cards.filter((card) => seedIds.includes(card.id)),
    [cards, seedIds],
  );

  function generateSandbox() {
    startTransition(async () => {
      setStory("");
      const response = await fetch("/api/generate-sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: seedCards.map((card) => card.id) }),
      });

      if (!response.ok) {
        setStory(await response.text());
        return;
      }

      await streamTextResponse(response, (token) =>
        setStory((current) => current + token),
      );
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[360px_1fr] md:px-8">
      <aside>
        <SeedPicker
          title="The Overstory Seeds"
          description="Choose 3 to 7 cards that will blossom into The Overstory Sandbox."
          cards={cards}
          selectedIds={seedIds}
          setSelectedIds={setSeedIds}
          min={3}
        />
      </aside>
      <section>
        <Card className="min-h-[calc(100vh-14rem)]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  The Overstory
                </p>
                <CardTitle>The Overstory Sandbox</CardTitle>
                <CardDescription>
                  Watch your vocabulary blossom into custom reading context.
                </CardDescription>
              </div>
              <Badge>
                <BookOpen className="mr-1 size-3" />
                {seedCards.length} seeds
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              disabled={
                seedCards.length < 3 || seedCards.length > 7 || isPending
              }
              onClick={generateSandbox}
              type="button"
            >
              <Sparkles />
              Generate Overstory
            </Button>
            <div className="mt-5 min-h-96 rounded-xl border border-border bg-background p-5 text-base leading-8">
              {story ? (
                <p>{tokenizeStory(story, seedCards)}</p>
              ) : (
                <p className="text-muted-foreground">
                  The Overstory will stream here. Hover highlighted vocabulary
                  for readings and definitions.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
