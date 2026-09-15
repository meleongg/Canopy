"use client";

import { useState } from "react";
import { Check, LoaderCircle, Plus, RotateCcw, X } from "lucide-react";
import { useCanopyTheme } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type {
  DictionaryPracticeExercise,
  DictionaryPracticeRound,
} from "@/lib/dictionary";

const exercises: {
  value: DictionaryPracticeExercise;
  title: string;
  description: string;
}[] = [
  {
    value: "pinyin",
    title: "Match the reading",
    description: "Choose the pinyin reading that belongs with a Chinese word.",
  },
  {
    value: "script",
    title: "Recognize Traditional",
    description: "Match a Simplified form with its Traditional counterpart.",
  },
];

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
    if (!round) return;
    setIsAdding(true);
    try {
      const response = await fetch("/api/dictionary/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: round.entry.entryId }),
      });
      if (!response.ok) throw new Error();
      setRound((current) =>
        current
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

  const isAnswered = selectedId !== null;
  const isCorrect = selectedId === round?.answerId;
  const shownForm =
    chineseScript === "traditional"
      ? round?.entry.traditional
      : round?.entry.simplified;

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

      {round ? (
        <article className="rounded-xl border border-border bg-card p-5 md:p-7">
          <p className="text-sm font-semibold text-primary">
            {round.exercise === "script"
              ? "Which Traditional form matches this Simplified word?"
              : "Which pinyin reading matches this word?"}
          </p>
          <h2 className="mt-4 font-sans text-4xl font-bold md:text-5xl">
            {round.exercise === "script" ? round.entry.simplified : shownForm}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {round.options.map((option) => {
              const isAnswer = option.id === round.answerId;
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
                {round.entry.simplified}
                {round.entry.traditional !== round.entry.simplified
                  ? ` / ${round.entry.traditional}`
                  : ""}{" "}
                · {round.entry.pinyin} · {round.entry.definitions.join("; ")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={() => void loadRound()}
                  type="button"
                  variant="outline"
                >
                  <RotateCcw /> Another contrast
                </Button>
                {round.entry.card ? (
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
    </section>
  );
}
