"use client";

import { useState } from "react";
import { Check, LoaderCircle, Plus, RotateCcw, X } from "lucide-react";
import { useCanopyTheme } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type {
  DictionaryPracticeExercise,
  DictionaryPracticeRound,
  DictionaryScriptPracticeRound,
} from "@/lib/dictionary";

const exercises: {
  value: DictionaryPracticeExercise;
  title: string;
  description: string;
}[] = [
  {
    value: "pinyin",
    title: "Tone match",
    description: "Choose the right tone-marked pinyin from related readings.",
  },
  {
    value: "script",
    title: "Match Traditional characters",
    description: "Pair Simplified characters with their Traditional forms.",
  },
];

function ScriptMatchRound({
  round,
  onAnother,
}: {
  round: DictionaryScriptPracticeRound;
  onAnother: () => void;
}) {
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const usedOptionIds = new Set(Object.values(matches));
  const isComplete = Object.keys(matches).length === round.pairs.length;
  const selectedPair = round.pairs.find((pair) => pair.id === selectedPairId);

  return (
    <article className="rounded-xl border border-border bg-card p-5 md:p-7">
      <p className="text-sm font-semibold text-primary">
        Match each Simplified character to its Traditional counterpart.
      </p>
      <div
        aria-live="polite"
        className="mt-2 min-h-12 text-sm text-muted-foreground"
      >
        {isChecked ? (
          "Review your matches below."
        ) : selectedPair ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex size-11 items-center justify-center rounded-lg bg-primary/20 font-sans text-3xl font-bold text-foreground ring-1 ring-primary/50">
              {selectedPair.simplified}
            </span>
            Now choose its Traditional match.
          </span>
        ) : (
          `${Object.keys(matches).length} of ${round.pairs.length} pairs chosen. Select a Simplified character to begin.`
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            1. Simplified
          </p>
          {round.pairs.map((pair) => {
            const matchedOptionId = matches[pair.id];
            const matchedOption = round.options.find(
              (option) => option.id === matchedOptionId,
            );
            const isCorrect = matchedOptionId === pair.id;
            return (
              <button
                aria-pressed={selectedPairId === pair.id}
                className={`flex min-h-20 w-full items-center justify-between rounded-lg border px-5 py-4 text-left font-sans text-4xl font-bold ${isChecked ? (isCorrect ? "border-primary bg-primary/15" : "border-destructive bg-destructive/10") : matchedOption ? "border-primary bg-primary/10" : selectedPairId === pair.id ? "border-primary bg-primary/20 shadow-sm ring-2 ring-primary/50" : "border-border bg-background hover:border-primary"}`}
                disabled={isChecked}
                key={pair.id}
                onClick={() => {
                  if (matchedOptionId) {
                    setMatches((current) => {
                      const next = { ...current };
                      delete next[pair.id];
                      return next;
                    });
                  }
                  setSelectedPairId(pair.id);
                }}
                type="button"
              >
                <span>{pair.simplified}</span>
                {matchedOption ? (
                  <span className="inline-flex items-center gap-2 text-2xl font-medium">
                    <span className="text-muted-foreground">→</span>
                    {matchedOption.text}
                  </span>
                ) : null}
                {isChecked ? (
                  isCorrect ? (
                    <Check className="size-5 text-primary" />
                  ) : (
                    <X className="size-5 text-destructive" />
                  )
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            2. Traditional
          </p>
          {round.options.map((option) => (
            <button
              className="flex w-full rounded-lg border border-border bg-background px-4 py-3 text-left font-sans text-2xl font-bold hover:border-primary disabled:opacity-45"
              disabled={
                isChecked || !selectedPairId || usedOptionIds.has(option.id)
              }
              key={option.id}
              onClick={() => {
                if (!selectedPairId) return;
                setMatches((current) => ({
                  ...current,
                  [selectedPairId]: option.id,
                }));
                setSelectedPairId(null);
              }}
              type="button"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
        {isChecked ? (
          <Button onClick={onAnother} type="button" variant="outline">
            <RotateCcw /> Another set
          </Button>
        ) : (
          <Button
            disabled={!isComplete}
            onClick={() => setIsChecked(true)}
            type="button"
          >
            Check matches
          </Button>
        )}
        {isChecked &&
        !round.pairs.every((pair) => matches[pair.id] === pair.id) ? (
          <Button
            onClick={() => {
              setMatches({});
              setSelectedPairId(null);
              setIsChecked(false);
            }}
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        ) : null}
      </div>
      {isChecked ? (
        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          {round.pairs.map((pair) => (
            <p key={pair.id}>
              {pair.simplified} / {pair.traditional} · {pair.source.simplified}{" "}
              / {pair.source.traditional} · {pair.source.pinyin}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ExploreChinesePracticeView() {
  const { chineseScript } = useCanopyTheme();
  const { toast } = useToast();
  const [exercise, setExercise] =
    useState<DictionaryPracticeExercise>("pinyin");
  const [round, setRound] = useState<DictionaryPracticeRound | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRound(nextExercise = exercise) {
    setExercise(nextExercise);
    setIsLoading(true);
    setSelectedId(null);
    setMessage("");
    try {
      const response = await fetch(
        `/api/dictionary/practice?exercise=${nextExercise}`,
      );
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as {
        round: DictionaryPracticeRound;
      };
      setRound(payload.round);
    } catch {
      setRound(null);
      setMessage("That practice round could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectExercise(nextExercise: DictionaryPracticeExercise) {
    setExercise(nextExercise);
    setRound(null);
    setSelectedId(null);
    setMessage("");
  }

  async function addToCollection() {
    if (!round || round.exercise !== "pinyin") return;
    setIsAdding(true);
    try {
      const response = await fetch("/api/dictionary/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: round.entry.entryId }),
      });
      if (!response.ok) throw new Error();
      setRound((current) =>
        current?.exercise === "pinyin"
          ? {
              ...current,
              entry: {
                ...current.entry,
                card: {
                  id: current.entry.entryId,
                  phoneticReading: current.entry.pinyin.split(/\s+/),
                  definitions: current.entry.definitions,
                },
              },
            }
          : current,
      );
      toast(`${round.entry.simplified} added to your collection.`);
    } catch {
      setMessage("That entry could not be added. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  const pinyinRound = round?.exercise === "pinyin" ? round : null;
  const isAnswered = selectedId !== null;
  const isCorrect = selectedId === pinyinRound?.answerId;
  const shownForm =
    chineseScript === "traditional"
      ? pinyinRound?.entry.traditional
      : pinyinRound?.entry.simplified;

  return (
    <section className="space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">
          Explore Chinese
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold md:text-4xl">
          Gentle practice
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Try a quick dictionary-backed contrast. These exercises never change
          your review schedule; add a word only when you want to learn it.
        </p>
      </header>

      <div
        aria-label="Explore Chinese exercise"
        className="grid gap-3 md:grid-cols-2"
      >
        {exercises.map((option) => (
          <button
            className={`rounded-xl border p-5 text-left transition ${exercise === option.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/70"}`}
            key={option.value}
            onClick={() => selectExercise(option.value)}
            type="button"
          >
            <span className="font-serif text-xl font-bold">{option.title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      {!round && !isLoading ? (
        <Button onClick={() => void loadRound()} type="button">
          Start a round
        </Button>
      ) : null}
      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Finding a contrast…
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {pinyinRound ? (
        <article className="rounded-xl border border-border bg-card p-5 md:p-7">
          <p className="text-sm font-semibold text-primary">
            Which tone-marked pinyin reading matches this word?
          </p>
          <h2 className="mt-4 font-sans text-4xl font-bold md:text-5xl">
            {shownForm}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pinyinRound.options.map((option) => {
              const isAnswer = option.id === pinyinRound.answerId;
              const isSelected = option.id === selectedId;
              const feedbackClass = !isAnswered
                ? "border-border bg-background hover:border-primary"
                : isAnswer
                  ? "border-primary bg-primary/15"
                  : isSelected
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-background opacity-60";
              return (
                <button
                  className={`flex min-h-14 items-center justify-between rounded-lg border px-4 text-left text-lg font-semibold transition ${feedbackClass}`}
                  disabled={isAnswered}
                  key={option.id}
                  onClick={() => setSelectedId(option.id)}
                  type="button"
                >
                  {option.text}
                  {isAnswered && isAnswer ? (
                    <Check className="size-5 text-primary" />
                  ) : null}
                  {isAnswered && isSelected && !isAnswer ? (
                    <X className="size-5 text-destructive" />
                  ) : null}
                </button>
              );
            })}
          </div>
          {isAnswered ? (
            <div className="mt-6 border-t border-border pt-5">
              <p className="font-semibold">
                {isCorrect ? "Nice match." : "Not quite—here is the match."}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {pinyinRound.entry.simplified}
                {pinyinRound.entry.traditional !== pinyinRound.entry.simplified
                  ? ` / ${pinyinRound.entry.traditional}`
                  : ""}{" "}
                · {pinyinRound.entry.pinyin} ·{" "}
                {pinyinRound.entry.definitions.join("; ")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={() => void loadRound()}
                  type="button"
                  variant="outline"
                >
                  <RotateCcw /> Another contrast
                </Button>
                {pinyinRound.entry.card ? (
                  <span className="inline-flex items-center gap-2 self-center text-sm font-semibold text-primary">
                    <Check className="size-4" /> In your collection
                  </span>
                ) : (
                  <Button
                    disabled={isAdding}
                    onClick={() => void addToCollection()}
                    type="button"
                  >
                    <Plus /> {isAdding ? "Adding…" : "Add to collection"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
      {round?.exercise === "script" ? (
        <ScriptMatchRound
          key={round.pairs[0]?.id}
          onAnother={() => void loadRound("script")}
          round={round}
        />
      ) : null}
    </section>
  );
}
