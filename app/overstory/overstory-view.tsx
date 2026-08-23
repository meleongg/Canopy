"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, LoaderCircle, Sparkles } from "lucide-react";
import { SeedPicker } from "@/components/canopy/seed-picker";
import { SpeechButton } from "@/components/canopy/speech-button";
import { ContextualChineseText } from "@/components/canopy/contextual-chinese-text";
import { fetchCards, streamTextResponse } from "@/components/canopy/card-utils";
import {
  DictionaryHelpControls,
  type DictionaryHelpDensity,
} from "@/components/canopy/dictionary-help-controls";
import { useDictionaryHelp } from "@/components/canopy/use-dictionary-help";
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
import { queryKeys } from "@/lib/query-keys";
import { canGenerateSpeech } from "@/lib/speech";
import { stripModelMarkdownMarkers } from "@/lib/ai-text";

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
  const [storyScope, setStoryScope] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [dictionaryHelp, setDictionaryHelp] = useState(false);
  const [dictionaryDensity, setDictionaryDensity] =
    useState<DictionaryHelpDensity>("helpful");
  const [isPending, startTransition] = useTransition();
  const seedCards = useMemo(
    () => cards.filter((card) => seedIds.includes(card.id)),
    [cards, seedIds],
  );
  const entriesByText = useDictionaryHelp({
    enabled: dictionaryHelp && isComplete,
    scopeKey: String(storyScope),
    texts: isComplete && story ? [story] : [],
  });

  function generateSandbox() {
    startTransition(async () => {
      setStoryScope((current) => current + 1);
      setStory("");
      setIsComplete(false);
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
        setStory((current) => stripModelMarkdownMarkers(`${current}${token}`)),
      );
      setIsComplete(true);
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
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={
                  seedCards.length < 3 || seedCards.length > 7 || isPending
                }
                onClick={generateSandbox}
                type="button"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                {isPending ? "Growing your story…" : "Generate Overstory"}
              </Button>
              {isPending ? (
                <span className="text-sm text-muted-foreground" role="status">
                  Your story is taking root…
                </span>
              ) : null}
              <span className="hidden h-8 w-px bg-border sm:block" />
              <DictionaryHelpControls
                density={dictionaryDensity}
                enabled={dictionaryHelp}
                setDensity={setDictionaryDensity}
                setEnabled={setDictionaryHelp}
                variant="compact"
              />
            </div>
            {isComplete ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Listen plays an AI-generated narrator voice. Audio is created
                only when you choose to play this completed story.
              </p>
            ) : null}
            {cards.length < 3 || seedCards.length < 3 ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {cards.length < 3
                  ? "Add at least three active cards before generating an Overstory."
                  : "Select at least three seeds to generate a story."}
                {cards.length < 3 ? (
                <Link
                  className="ml-1 font-semibold text-primary"
                  href="/dashboard"
                >
                  Go to Dashboard
                </Link>
                ) : null}
              </p>
            ) : null}
            <div className="mt-5 min-h-96 rounded-xl border border-border bg-background p-5 text-base leading-8">
              {isComplete && canGenerateSpeech(story) ? (
                <div className="mb-4 border-b border-border pb-3">
                  <SpeechButton disabled={false} speaker="narrator" text={story} />
                </div>
              ) : null}
              {story ? (
                <p>
                  <ContextualChineseText
                    density={dictionaryDensity}
                    entries={entriesByText.get(story) ?? []}
                    lookupEnabled={isComplete && dictionaryHelp}
                    seedCards={seedCards}
                    text={story}
                  />
                </p>
              ) : (
                <p className="text-muted-foreground">
                  The Overstory will stream here. Hover highlighted vocabulary
                  for readings and definitions.
                </p>
              )}
            </div>
            {isComplete ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Your Overstory is complete and saved privately to your
                  practice history.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {!canGenerateSpeech(story) ? (
                    <p className="text-xs text-muted-foreground">
                      This story is too long for one audio clip.
                    </p>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href="/history">View practice history</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
