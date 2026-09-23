"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  FileText,
  LoaderCircle,
  MessageCircle,
  PencilLine,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  addFlashcardAction,
  generateContextAction,
  generateDraftContextAction,
  removeContextAction,
} from "@/app/actions";
import {
  contextGeneratedLabel,
  dueLabel,
  fetchCardsByScope,
  growthLabel,
} from "@/components/canopy/card-utils";
import { CardDisplayText } from "@/components/canopy/card-display-text";
import { displayPhoneticReading } from "@/lib/phonetics";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  draftFieldsFromDictionaryEntry,
  headwordLengthMessage,
  MAX_HEADWORD_HAN_CHARS,
  type AutofillMatch,
  type AutofillResult,
} from "@/lib/card-draft";
import { MAX_EXAMPLE_CONTEXTS } from "@/lib/example-contexts";
import { queryKeys } from "@/lib/query-keys";
import type { LearningRhythmDay } from "@/lib/learning-rhythm";
import { cn } from "@/lib/utils";

const initialAddState = {
  ok: true,
  message: "Add one Mandarin card to your collection.",
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCards });
  void queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue });
  void queryClient.invalidateQueries({ queryKey: queryKeys.overstorySeeds });
  void queryClient.invalidateQueries({ queryKey: queryKeys.understorySeeds });
}

function AddCardPanel() {
  const queryClient = useQueryClient();
  const [targetText, setTargetText] = useState("");
  const [phoneticReading, setPhoneticReading] = useState("");
  const [definitions, setDefinitions] = useState("");
  const [exampleContext, setExampleContext] = useState("");
  const [dictionaryEntryId, setDictionaryEntryId] = useState("");
  const [autofill, setAutofill] = useState<AutofillResult | null>(null);
  const [autofillPending, setAutofillPending] = useState(false);
  const [contextPending, setContextPending] = useState(false);
  const [contextMessage, setContextMessage] = useState("");
  const [addState, addAction, addPending] = useActionState(
    async (state: typeof initialAddState, formData: FormData) => {
      const result = await addFlashcardAction(state, formData);
      if (result.ok) {
        setTargetText("");
        setPhoneticReading("");
        setDefinitions("");
        setExampleContext("");
        setDictionaryEntryId("");
        setAutofill(null);
        setContextMessage("");
        invalidate(queryClient);
      }
      return result;
    },
    initialAddState,
  );

  const lengthHelp = headwordLengthMessage(targetText.trim());
  const canGenerateContext =
    Boolean(targetText.trim()) &&
    Boolean(definitions.trim()) &&
    !lengthHelp &&
    !exampleContext.trim();

  async function generateContextDraft() {
    if (!canGenerateContext || contextPending) return;
    setContextPending(true);
    setContextMessage("");
    try {
      const formData = new FormData();
      formData.set("targetText", targetText.trim());
      formData.set("phoneticReading", phoneticReading.trim());
      formData.set("definitions", definitions.trim());
      const result = await generateDraftContextAction(formData);
      if (result.ok && result.sentence) {
        setExampleContext(result.sentence);
      }
      setContextMessage(result.message);
    } catch {
      setContextMessage(
        "Context could not be generated. Try again, or write your own.",
      );
    } finally {
      setContextPending(false);
    }
  }

  useEffect(() => {
    const query = targetText.trim();
    if (!query) {
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setAutofillPending(true);
        try {
          const response = await fetch("/api/dictionary/autofill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });
          if (!response.ok) {
            setAutofill(null);
            return;
          }
          setAutofill((await response.json()) as AutofillResult);
        } catch {
          setAutofill(null);
        } finally {
          setAutofillPending(false);
        }
      })();
    }, 320);

    return () => window.clearTimeout(handle);
  }, [targetText]);

  function applyMatch(match: AutofillMatch) {
    const draft = draftFieldsFromDictionaryEntry(match);
    setTargetText(draft.targetText);
    setPhoneticReading(draft.phoneticReading);
    setDefinitions(draft.definitions);
    setDictionaryEntryId(draft.dictionaryEntryId ?? "");
  }

  function updateTargetText(value: string) {
    setTargetText(value);
    setDictionaryEntryId("");
    if (!value.trim()) {
      setAutofill(null);
      setAutofillPending(false);
    }
  }

  return (
    <Card asChild>
      <form action={addAction}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle>Add Card</CardTitle>
              <CardDescription>
                Type a Mandarin word, phrase, or English gloss. Matching
                CC-CEDICT entries fill an editable draft—confirm before saving.
              </CardDescription>
            </div>
            <PencilLine
              aria-hidden
              className="mt-1 size-6 shrink-0 text-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Language: Mandarin</p>
          <input
            name="dictionaryEntryId"
            type="hidden"
            value={dictionaryEntryId}
          />
          <label
            className="mt-4 mb-2 block text-sm font-medium"
            htmlFor="targetText"
          >
            Word or phrase
          </label>
          <Input
            id="targetText"
            name="targetText"
            onChange={(event) => {
              updateTargetText(event.target.value);
            }}
            placeholder="机场, jichang, or airport"
            required
            value={targetText}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Headwords up to {MAX_HEADWORD_HAN_CHARS} Chinese characters. Search
            by hanzi, toneless pinyin, or English gloss.
          </p>
          {lengthHelp ? (
            <p className="mt-2 text-sm text-primary" role="status">
              {lengthHelp}
            </p>
          ) : null}
          {autofillPending ? (
            <p
              className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <LoaderCircle className="size-4 animate-spin" />
              Looking up CC-CEDICT matches…
            </p>
          ) : null}
          {autofill?.helpMessage ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {autofill.helpMessage}
            </p>
          ) : null}
          {autofill && autofill.matches.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Dictionary matches
              </p>
              {autofill.matches.map((match) => (
                <button
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-card"
                  key={match.entryId}
                  onClick={() => applyMatch(match)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold">
                        {match.simplified}
                        {match.traditional !== match.simplified
                          ? ` · ${match.traditional}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.pinyin}
                      </p>
                      <p className="mt-1 truncate text-sm">
                        {match.definitions.slice(0, 3).join("; ")}
                      </p>
                    </div>
                    <Badge>
                      {match.matchKind === "exact"
                        ? "Exact"
                        : match.matchKind === "component"
                          ? "In phrase"
                          : "Match"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          <label
            className="mt-4 mb-2 block text-sm font-medium"
            htmlFor="phoneticReading"
          >
            Pinyin
          </label>
          <Input
            id="phoneticReading"
            name="phoneticReading"
            onChange={(event) => setPhoneticReading(event.target.value)}
            placeholder="Filled from CC-CEDICT when matched"
            value={phoneticReading}
          />
          <label
            className="mt-4 mb-2 block text-sm font-medium"
            htmlFor="definitions"
          >
            Definitions
          </label>
          <Input
            id="definitions"
            name="definitions"
            onChange={(event) => setDefinitions(event.target.value)}
            placeholder="airport; terminal"
            required
            value={definitions}
          />
          <label
            className="mt-4 mb-2 block text-sm font-medium"
            htmlFor="exampleContext"
          >
            Context
          </label>
          <Textarea
            id="exampleContext"
            name="exampleContext"
            onChange={(event) => {
              setExampleContext(event.target.value);
              setContextMessage("");
            }}
            placeholder="Optional example or source sentence"
            value={exampleContext}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            One optional context on add. Generate more later from Collection.
          </p>
          {contextPending ? (
            <div
              className="mt-3 flex items-start gap-3 rounded-lg border border-primary/30 bg-background p-3 text-sm"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="font-medium">Generating context…</p>
                <p className="mt-1 text-muted-foreground">
                  Writing one example sentence for this draft. You can still
                  edit it before saving.
                </p>
              </div>
            </div>
          ) : null}
          {canGenerateContext || contextPending ? (
            <Button
              className="mt-3 w-full"
              disabled={!canGenerateContext || contextPending || addPending}
              onClick={() => void generateContextDraft()}
              type="button"
              variant="outline"
            >
              {contextPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {contextPending ? "Generating context…" : "Generate context"}
            </Button>
          ) : null}
          {contextMessage ? (
            <p
              className={cn(
                "mt-2 text-sm",
                exampleContext.trim()
                  ? "text-muted-foreground"
                  : "text-primary",
              )}
              role="status"
            >
              {contextMessage}
            </p>
          ) : null}
          <Button
            className="mt-4 w-full"
            disabled={addPending || Boolean(lengthHelp) || contextPending}
            type="submit"
          >
            <FileText />
            {addPending ? "Saving…" : "Add Flashcard"}
          </Button>
          <p
            className={cn(
              "mt-3 text-sm",
              addState.ok ? "text-muted-foreground" : "text-primary",
            )}
          >
            {addState.message}
          </p>
        </CardContent>
      </form>
    </Card>
  );
}

export function ReviewQueue({
  cards,
  archived,
}: {
  cards: WorkspaceCard[];
  archived: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingCard, setEditingCard] = useState<WorkspaceCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<WorkspaceCard | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;

  async function runAction(
    action: (formData: FormData) => Promise<void>,
    formData: FormData,
  ) {
    await action(formData);
    invalidate(queryClient);
  }

  async function updateCard(
    cardId: string,
    body: Record<string, unknown>,
    method = "PATCH",
  ) {
    const response = await fetch(`/api/cards/${cardId}`, {
      method,
      headers:
        method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
      body: method === "PATCH" ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      setActionMessage("That change could not be saved. Please try again.");
      return false;
    }
    invalidate(queryClient);
    return true;
  }

  async function saveCardEdit(formData: FormData) {
    if (!editingCard) return;
    const targetText = String(formData.get("targetText") ?? "").trim();
    const definitions = String(formData.get("definitions") ?? "")
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!targetText || definitions.length === 0) {
      setActionMessage("Add a word or phrase and at least one definition.");
      return;
    }
    const saved = await updateCard(editingCard.id, {
      targetText,
      phoneticReading: String(formData.get("phoneticReading") ?? "")
        .split(/\s+/)
        .filter(Boolean),
      definitions,
    });
    if (saved) {
      setEditingCard(null);
      toast("Card details saved.");
    }
  }

  async function deleteSelectedCard() {
    if (!deletingCard) return;
    if (await updateCard(deletingCard.id, {}, "DELETE")) {
      setDeletingCard(null);
      toast("Card permanently deleted.");
    }
  }

  async function toggleArchive(cardId: string) {
    if (await updateCard(cardId, { archived: !archived })) {
      toast(
        archived
          ? "Card restored to your active collection."
          : "Card archived.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Your collection</CardTitle>
            </div>
            <CardDescription>
              Browse and care for your vocabulary here. Due cards are reviewed
              one at a time in a focused session.
              {archived
                ? " Archived cards are kept out of review and AI practice."
                : ""}
            </CardDescription>
          </div>
          <Badge>{dueCount} due</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cards.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground lg:col-span-2">
              {archived
                ? "No archived cards yet. Cards you archive will rest here."
                : "Your collection is ready for its first seed. Add a card to begin."}
            </div>
          ) : null}
          {cards.map((card) => (
            <details
              className="group rounded-xl border border-border bg-background"
              key={card.id}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:content-none hover:bg-card [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-primary">
                    {growthLabel(card)} · {dueLabel(card)}
                  </p>
                  <h3 className="mt-1 truncate font-serif text-xl font-bold">
                    <CardDisplayText card={card} />
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayPhoneticReading(
                      card.languageCode,
                      card.phoneticReading,
                    ) || card.definitions[0]}
                  </p>
                </div>
                <Badge>{card.languageCode} · Details</Badge>
              </summary>
              <div className="border-t border-border p-4">
                <p className="text-sm leading-6">
                  {card.definitions.join("; ")}
                </p>
                {card.aiExampleContexts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {card.aiExampleContexts.map((context, contextIndex) => (
                      <div
                        className="rounded-lg border border-border bg-card p-3 text-sm"
                        key={`${context.sentence}-${contextIndex}`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Context {contextIndex + 1} generated{" "}
                            {contextGeneratedLabel(context.generatedAt)}
                          </p>
                          <form
                            action={(formData) =>
                              runAction(removeContextAction, formData)
                            }
                          >
                            <input
                              name="cardId"
                              type="hidden"
                              value={card.id}
                            />
                            <input
                              name="contextIndex"
                              type="hidden"
                              value={contextIndex}
                            />
                            <Button
                              size="icon"
                              title="Remove context"
                              type="submit"
                              variant="outline"
                            >
                              <X className="size-3" />
                            </Button>
                          </form>
                        </div>
                        <p className="font-semibold">{context.sentence}</p>
                        <p className="mt-1 text-muted-foreground">
                          {context.phonetic}
                        </p>
                        <p className="mt-1">{context.translation}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() => setEditingCard(card)}
                    type="button"
                    variant="outline"
                  >
                    <PencilLine /> Edit
                  </Button>
                  <Button
                    onClick={() => void toggleArchive(card.id)}
                    type="button"
                    variant="outline"
                  >
                    {archived ? <ArchiveRestore /> : <Archive />}
                    {archived ? "Restore" : "Archive"}
                  </Button>
                  <Button
                    onClick={() => setDeletingCard(card)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 /> Delete
                  </Button>
                  {!archived ? (
                    <>
                      <form
                        action={(formData) =>
                          runAction(generateContextAction, formData)
                        }
                      >
                        <input name="cardId" type="hidden" value={card.id} />
                        <Button
                          disabled={
                            card.aiExampleContexts.length >=
                            MAX_EXAMPLE_CONTEXTS
                          }
                          title="Generate and save one more example sentence, reading, and translation for this card."
                          type="submit"
                          variant="outline"
                        >
                          <Sparkles />
                          {card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
                            ? "Max Contexts"
                            : card.aiExampleContexts.length > 0
                              ? "Generate Another"
                              : "Generate Context"}
                        </Button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            </details>
          ))}
          {actionMessage ? (
            <p
              className="mt-4 rounded-lg border border-primary/40 bg-card p-3 text-sm text-muted-foreground"
              role="status"
            >
              {actionMessage}
            </p>
          ) : null}
        </div>
      </CardContent>
      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditingCard(null);
        }}
        open={Boolean(editingCard)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>
              These details belong to your Canopy collection. Reference
              dictionary data remains separate.
            </DialogDescription>
          </DialogHeader>
          {editingCard ? (
            <form action={saveCardEdit} className="mt-5 space-y-4">
              <div>
                <label
                  className="text-sm font-semibold"
                  htmlFor="edit-target-text"
                >
                  Word or phrase
                </label>
                <Input
                  defaultValue={editingCard.targetText}
                  id="edit-target-text"
                  name="targetText"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="edit-reading">
                  Reading{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  defaultValue={editingCard.phoneticReading.join(" ")}
                  id="edit-reading"
                  name="phoneticReading"
                />
              </div>
              <div>
                <label
                  className="text-sm font-semibold"
                  htmlFor="edit-definitions"
                >
                  Definitions
                </label>
                <Textarea
                  defaultValue={editingCard.definitions.join("; ")}
                  id="edit-definitions"
                  name="definitions"
                  required
                  rows={3}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Separate definitions with semicolons.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setEditingCard(null)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button type="submit">Save card</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(open) => {
          if (!open) setDeletingCard(null);
        }}
        open={Boolean(deletingCard)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this card?</DialogTitle>
            <DialogDescription>
              {deletingCard
                ? `“${deletingCard.targetText}” will be permanently removed from your collection. This cannot be undone.`
                : "This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              onClick={() => setDeletingCard(null)}
              type="button"
              variant="outline"
            >
              Keep card
            </Button>
            <Button
              onClick={() => void deleteSelectedCard()}
              type="button"
              variant="destructive"
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LearningRhythm({ days }: { days: LearningRhythmDay[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning rhythm</CardTitle>
        <CardDescription>
          A gentle look at your recent review and practice activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const count = day.reviewCount + day.practiceCount;
          return (
            <div className="text-center" key={day.date}>
              <div
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold",
                  count > 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
                title={`${day.reviewCount} review${day.reviewCount === 1 ? "" : "s"} and ${day.practiceCount} practice session${day.practiceCount === 1 ? "" : "s"}`}
              >
                {count}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(
                  new Date(`${day.date}T12:00:00Z`),
                )}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  initialCards,
  initialLearningRhythm,
}: {
  initialCards: WorkspaceCard[];
  initialLearningRhythm: LearningRhythmDay[];
}) {
  const [addCardOpen, setAddCardOpen] = useState(false);
  const { data: cards = [] } = useQuery({
    queryKey: queryKeys.dashboardCards,
    queryFn: () => fetchCardsByScope("active"),
    initialData: initialCards,
  });
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;
  const contextCount = cards.reduce(
    (count, card) => count + card.aiExampleContexts.length,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <section className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">
            Your grove
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Today&apos;s learning
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review what is ready, then turn your vocabulary into reading and
            conversation practice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setAddCardOpen(true)}
            type="button"
            variant="outline"
          >
            <FileText />
            Add card
          </Button>
        </div>
      </section>

      <section
        aria-label="Collection summary"
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Cards
          </p>
          <p className="mt-1 font-serif text-3xl font-bold">{cards.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Due now
          </p>
          <p className="mt-1 font-serif text-3xl font-bold">{dueCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Contexts
          </p>
          <p className="mt-1 font-serif text-3xl font-bold">{contextCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">
              Sprouting queue
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold">
              {dueCount > 0
                ? `${dueCount} card${dueCount === 1 ? "" : "s"} ready to revisit`
                : "Your review queue is clear"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {dueCount > 0
                ? "Settle into a focused, one-card-at-a-time review."
                : "Return later, or use your vocabulary in a story or conversation."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild disabled={dueCount === 0}>
              <Link href="/review">Start review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/practice">Free practice</Link>
            </Button>
          </div>
        </div>
        {cards
          .filter((card) => new Date(card.nextReviewAt) <= new Date())
          .slice(0, 5).length > 0 ? (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Ready now
            </p>
            {cards
              .filter((card) => new Date(card.nextReviewAt) <= new Date())
              .slice(0, 5)
              .map((card) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  key={card.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-semibold">
                      <CardDisplayText card={card} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayPhoneticReading(
                        card.languageCode,
                        card.phoneticReading,
                      ) || card.definitions[0]}
                    </p>
                  </div>
                  <Badge>{card.languageCode}</Badge>
                </div>
              ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl font-semibold">Your collection</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Browse, search, and care for every active or archived card in one
          place.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/collection">Open collection</Link>
        </Button>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Continue practising</CardTitle>
            <CardDescription>
              Use active vocabulary in a short story or guided conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/overstory">
                <BookOpen />
                Open Overstory
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/understory/setup">
                <MessageCircle />
                Start Understory
              </Link>
            </Button>
          </CardContent>
        </Card>
        <LearningRhythm days={initialLearningRhythm} />
      </section>

      <Sheet
        onOpenChange={setAddCardOpen}
        open={addCardOpen}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add a card</SheetTitle>
            <SheetDescription>
              Add one Mandarin word or phrase to your private learning collection.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            <AddCardPanel />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
