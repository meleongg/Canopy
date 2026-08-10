"use client";

import { useActionState, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Archive,
  ArchiveRestore,
  CircleHelp,
  FileText,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  addFlashcardAction,
  createFlashcardsFromPreviewAction,
  generateContextAction,
  removeContextAction,
  reviewCardAction,
} from "@/app/actions";
import {
  contextGeneratedLabel,
  dueLabel,
  fetchCardsByScope,
  growthLabel,
  reviewLabels,
} from "@/components/canopy/card-utils";
import { LanguageSelect } from "@/components/canopy/language-select";
import type { ImportDraft, WorkspaceCard } from "@/components/canopy/types";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  MAX_EXAMPLE_CONTEXTS,
  type ExampleContext,
} from "@/lib/example-contexts";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const initialImportState = {
  ok: true,
  message: "Paste a dictionary log or upload a .txt file.",
};

const initialAddState = {
  ok: true,
  message: "Add one card directly.",
};

const importExamples: Record<string, string> = {
  "zh-CN":
    "福利\tfu2li4\tnoun material benefit; welfare\n会议\thui4yi4\tmeeting; conference",
  "zh-HK": "飲茶\tyum2 caa4\tdrink tea; dim sum\n附近\tnearby",
  "fr-FR": "hôpital\thospital\nréunion\tmeeting",
  und: "kinship\tfamily relationship\nthreshold\tstarting point",
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCards });
  void queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue });
  void queryClient.invalidateQueries({ queryKey: queryKeys.overstorySeeds });
  void queryClient.invalidateQueries({ queryKey: queryKeys.understorySeeds });
}

function ImportPanel() {
  const queryClient = useQueryClient();
  const [importState, importAction, importPending] = useActionState(
    async (state: typeof initialImportState, formData: FormData) => {
      const result = await createFlashcardsFromPreviewAction(state, formData);
      invalidate(queryClient);
      return result;
    },
    initialImportState,
  );
  const [importLanguage, setImportLanguage] = useState("zh-CN");
  const [importRawText, setImportRawText] = useState("");
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [importPreviewMessage, setImportPreviewMessage] = useState("");
  const [importPreviewPending, setImportPreviewPending] = useState(false);

  async function readImportFile(file: File) {
    const text = await file.text();
    setImportRawText(text);
    setImportPreviewMessage(`Loaded ${file.name}. Preview before creating.`);
  }

  async function previewImport() {
    const rawText = importRawText.trim();
    if (!rawText) {
      setImportPreviewMessage("Paste text or drop a .txt file first.");
      return;
    }

    setImportPreviewPending(true);
    setImportPreviewMessage("");

    try {
      const response = await fetch("/api/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, languageCode: importLanguage }),
      });

      if (!response.ok) {
        setImportPreviewMessage(await response.text());
        return;
      }

      const payload = (await response.json()) as { entries?: ImportDraft[] };
      const drafts = (payload.entries ?? []).map((entry) => ({
        ...entry,
        exampleContexts: (entry.exampleContexts ?? []).slice(
          0,
          MAX_EXAMPLE_CONTEXTS,
        ),
      }));

      setImportDrafts(drafts);
      setImportPreviewMessage(
        drafts.length
          ? `Previewing ${drafts.length} flashcard draft${drafts.length === 1 ? "" : "s"}.`
          : "No importable entries found.",
      );
    } finally {
      setImportPreviewPending(false);
    }
  }

  function updateImportDraft(
    index: number,
    updater: (draft: ImportDraft) => ImportDraft,
  ) {
    setImportDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? updater(draft) : draft,
      ),
    );
  }

  function updateImportDraftContext(
    draftIndex: number,
    contextIndex: number,
    updater: (context: ExampleContext) => ExampleContext,
  ) {
    updateImportDraft(draftIndex, (draft) => ({
      ...draft,
      exampleContexts: draft.exampleContexts.map((context, nextIndex) =>
        nextIndex === contextIndex ? updater(context) : context,
      ),
    }));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Import</CardTitle>
            <CardDescription>
              Paste raw text or preview Pleco-style dictionary exports before
              creating flashcards.
            </CardDescription>
          </div>
          <Upload className="size-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <label className="text-sm font-medium" htmlFor="languageCode">
          Language
        </label>
        <LanguageSelect
          value={importLanguage}
          onValueChange={setImportLanguage}
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="rawText">
          Raw text
        </label>
        <Textarea
          className="mt-2 min-h-36 border-dashed"
          id="rawText"
          onChange={(event) => setImportRawText(event.target.value)}
          placeholder={importExamples[importLanguage]}
          value={importRawText}
        />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Tabs and simple CSV are supported. Pleco exported examples are kept as
          editable context sentences.
        </p>

        <div
          className="mt-3 rounded-lg border border-dashed border-border bg-background p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const [file] = Array.from(event.dataTransfer.files);
            if (file) {
              void readImportFile(file);
            }
          }}
        >
          <Input
            className="h-12 cursor-pointer p-1.5 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:font-sans file:text-sm file:font-semibold file:text-primary-foreground file:transition-colors hover:file:bg-primary/90"
            onChange={(event) => {
              const [file] = Array.from(event.target.files ?? []);
              if (file) {
                void readImportFile(file);
              }
            }}
            type="file"
            accept=".txt,text/plain"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Drag and drop a Pleco export, dictionary history, bookmark export,
            or plain .txt vocabulary list here.
          </p>
        </div>

        <Button
          className="mt-4 w-full"
          disabled={importPreviewPending}
          onClick={previewImport}
          type="button"
        >
          <Search />
          Preview Flashcards
        </Button>
        <p
          className={cn(
            "mt-3 text-sm",
            importState.ok ? "text-muted-foreground" : "text-primary",
          )}
        >
          {importPreviewMessage || importState.message}
        </p>

        {importDrafts.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Preview
            </p>
            {importDrafts.map((draft, draftIndex) => (
              <div
                className="rounded-lg border border-border bg-background p-3"
                key={`${draft.targetText}-${draftIndex}`}
              >
                <label className="block text-xs font-semibold uppercase text-muted-foreground">
                  Word
                </label>
                <Input
                  className="mt-1 bg-card"
                  onChange={(event) =>
                    updateImportDraft(draftIndex, (current) => ({
                      ...current,
                      targetText: event.target.value,
                    }))
                  }
                  value={draft.targetText}
                />
                <label className="mt-3 block text-xs font-semibold uppercase text-muted-foreground">
                  Reading
                </label>
                <Input
                  className="mt-1 bg-card"
                  onChange={(event) =>
                    updateImportDraft(draftIndex, (current) => ({
                      ...current,
                      phoneticReading: event.target.value
                        .split(/\s+/)
                        .filter(Boolean),
                    }))
                  }
                  value={draft.phoneticReading.join(" ")}
                />
                <label className="mt-3 block text-xs font-semibold uppercase text-muted-foreground">
                  Definitions
                </label>
                <Textarea
                  className="mt-1 bg-card"
                  onChange={(event) =>
                    updateImportDraft(draftIndex, (current) => ({
                      ...current,
                      definitions: event.target.value
                        .split(";")
                        .map((definition) => definition.trim())
                        .filter(Boolean),
                    }))
                  }
                  value={draft.definitions.join("; ")}
                />
                {draft.exampleContexts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Contexts
                    </p>
                    {draft.exampleContexts.map((context, contextIndex) => (
                      <div
                        className="rounded-lg border border-border bg-card p-2"
                        key={`${context.sentence}-${contextIndex}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Example {contextIndex + 1}
                          </span>
                          <Button
                            onClick={() =>
                              updateImportDraft(draftIndex, (current) => ({
                                ...current,
                                exampleContexts: current.exampleContexts.filter(
                                  (_item, nextIndex) =>
                                    nextIndex !== contextIndex,
                                ),
                              }))
                            }
                            size="icon"
                            title="Remove context"
                            type="button"
                            variant="outline"
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                        <Input
                          className="mt-2 bg-background"
                          onChange={(event) =>
                            updateImportDraftContext(
                              draftIndex,
                              contextIndex,
                              (current) => ({
                                ...current,
                                sentence: event.target.value,
                              }),
                            )
                          }
                          value={context.sentence}
                        />
                        <Input
                          className="mt-2 bg-background"
                          onChange={(event) =>
                            updateImportDraftContext(
                              draftIndex,
                              contextIndex,
                              (current) => ({
                                ...current,
                                phonetic: event.target.value,
                              }),
                            )
                          }
                          value={context.phonetic}
                        />
                        <Textarea
                          className="mt-2 min-h-16 bg-background"
                          onChange={(event) =>
                            updateImportDraftContext(
                              draftIndex,
                              contextIndex,
                              (current) => ({
                                ...current,
                                translation: event.target.value,
                              }),
                            )
                          }
                          value={context.translation}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <form action={importAction}>
              <input
                name="previewEntries"
                type="hidden"
                value={JSON.stringify(importDrafts)}
              />
              <Button className="w-full" disabled={importPending} type="submit">
                <Upload />
                Create Flashcards
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AddCardPanel() {
  const queryClient = useQueryClient();
  const [addState, addAction, addPending] = useActionState(
    async (state: typeof initialAddState, formData: FormData) => {
      const result = await addFlashcardAction(state, formData);
      invalidate(queryClient);
      return result;
    },
    initialAddState,
  );

  return (
    <Card asChild>
      <form action={addAction}>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Add Card</CardTitle>
              <CardDescription>
                Create a single flashcard without an import file.
              </CardDescription>
            </div>
            <PencilLine className="size-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <label className="text-sm font-medium" htmlFor="manualLanguageCode">
            Language
          </label>
          <LanguageSelect name="manualLanguageCode" />
          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="targetText"
          >
            Word or phrase
          </label>
          <Input id="targetText" name="targetText" placeholder="机场" />
          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="phoneticReading"
          >
            Reading
          </label>
          <Input
            id="phoneticReading"
            name="phoneticReading"
            placeholder="Optional; auto-generates for Chinese"
          />
          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="definitions"
          >
            Definitions
          </label>
          <Input
            id="definitions"
            name="definitions"
            placeholder="airport; terminal"
          />
          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="exampleContext"
          >
            Context
          </label>
          <Textarea
            id="exampleContext"
            name="exampleContext"
            placeholder="Optional example sentence"
          />
          <Button className="mt-4 w-full" disabled={addPending} type="submit">
            <FileText />
            Add Flashcard
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

function ReviewQueue({
  cards,
  archived,
}: {
  cards: WorkspaceCard[];
  archived: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [queueFilter, setQueueFilter] = useState<"due" | "all">(
    archived ? "all" : "due",
  );
  const [editingCard, setEditingCard] = useState<WorkspaceCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<WorkspaceCard | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;
  const queueCards = useMemo(() => {
    if (queueFilter === "all") {
      return cards;
    }

    return cards.filter((card) => new Date(card.nextReviewAt) <= new Date());
  }, [cards, queueFilter]);

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
              <CardTitle>The Sprouting Queue</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    aria-label="How review scheduling works"
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <CircleHelp />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>SM-2 Review Scheduling</DialogTitle>
                    <DialogDescription>
                      Canopy uses the SuperMemo-2 pattern to decide when each
                      card comes back.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-5 space-y-4 text-sm leading-6">
                    <p>
                      <strong>Interval</strong> is the number of days until the
                      next review. It grows after successful reviews.
                    </p>
                    <p>
                      <strong>EF</strong> is the ease factor. Higher EF makes
                      future intervals grow faster. Hard reviews lower it.
                    </p>
                    <p>
                      The review buttons are quality scores:{" "}
                      <strong>2 Hard</strong>, <strong>3 Pass</strong>,{" "}
                      <strong>4 Good</strong>, and <strong>5 Easy</strong>.
                    </p>
                    <p>
                      The queue defaults to Due cards. Use All to browse the
                      whole collection.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Cards are sorted by next review date. Review buttons update their
              next interval.
              {archived
                ? " Archived cards are kept out of review and AI practice."
                : ""}
            </CardDescription>
          </div>
          <Badge>{dueCount} due</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="inline-flex rounded-lg border border-border bg-background p-1 text-sm">
          <Button
            onClick={() => setQueueFilter("due")}
            size="sm"
            type="button"
            variant={queueFilter === "due" ? "default" : "ghost"}
          >
            Due ({dueCount})
          </Button>
          <Button
            onClick={() => setQueueFilter("all")}
            size="sm"
            type="button"
            variant={queueFilter === "all" ? "default" : "ghost"}
          >
            All ({cards.length})
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {cards.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground lg:col-span-2">
              No cards are available yet. Import vocabulary or run{" "}
              <code>npm run db:seed</code> after pushing the schema.
            </div>
          ) : null}
          {cards.length > 0 && queueCards.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground lg:col-span-2">
              No cards are due right now. Switch to All to browse the full
              collection.
            </div>
          ) : null}
          {queueCards.map((card) => (
            <article
              className="rounded-xl border border-border bg-background p-5"
              key={card.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-primary">
                    {growthLabel(card)} · {dueLabel(card)}
                  </p>
                  <h3 className="mt-1 truncate font-serif text-3xl font-bold">
                    {card.targetText}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.phoneticReading.join(" ")}
                  </p>
                </div>
                <Badge title="Ease factor: higher means the card grows longer review intervals after successful reviews.">
                  EF {(card.easiness / 100).toFixed(2)}
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-6">
                {card.definitions.join("; ")}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span title="SM-2 interval: days until the next review.">
                  Interval {card.interval}d
                </span>
                <span>Rep {card.repetition}</span>
                <span>{card.languageCode}</span>
              </div>
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
                          <input name="cardId" type="hidden" value={card.id} />
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
                    <p className="basis-full text-xs text-muted-foreground">
                      Review: 2 Hard · 3 Pass · 4 Good · ✓ Easy
                    </p>
                    {[2, 3, 4, 5].map((quality) => (
                      <form
                        action={(formData) =>
                          runAction(reviewCardAction, formData)
                        }
                        key={quality}
                      >
                        <input name="cardId" type="hidden" value={card.id} />
                        <input name="quality" type="hidden" value={quality} />
                        <Button
                          size="icon"
                          title={`Review quality ${quality}: ${reviewLabels[quality]}`}
                          type="submit"
                          variant="outline"
                        >
                          {quality === 5 ? <Check /> : quality}
                        </Button>
                      </form>
                    ))}
                    <form
                      action={(formData) =>
                        runAction(generateContextAction, formData)
                      }
                    >
                      <input name="cardId" type="hidden" value={card.id} />
                      <Button
                        disabled={
                          card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
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
            </article>
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
              These details are private to your Canopy. The shared dictionary
              entry remains unchanged.
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

function ConsistencyWell({ cards }: { cards: WorkspaceCard[] }) {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    return date;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistency Well</CardTitle>
        <CardDescription>
          New seeds planted across the last seven days.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const count = cards.filter((card) => {
            const created = new Date(card.createdAt);
            return (
              created.getFullYear() === day.getFullYear() &&
              created.getMonth() === day.getMonth() &&
              created.getDate() === day.getDate()
            );
          }).length;
          return (
            <div className="text-center" key={day.toISOString()}>
              <div
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold",
                  count > 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
                title={`${count} card${count === 1 ? "" : "s"} planted`}
              >
                {count}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(
                  day,
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
}: {
  initialCards: WorkspaceCard[];
}) {
  const [collectionScope, setCollectionScope] = useState<"active" | "archived">(
    "active",
  );
  const { data: cards = [] } = useQuery({
    queryKey: [...queryKeys.dashboardCards, collectionScope],
    queryFn: () => fetchCardsByScope(collectionScope),
    initialData: collectionScope === "active" ? initialCards : undefined,
  });
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;
  const contextCount = cards.reduce(
    (count, card) => count + card.aiExampleContexts.length,
    0,
  );

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[380px_1fr] md:px-8">
      <aside className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Import vocabulary, tend reviews, and monitor the current Canopy.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Cards
              </p>
              <p className="mt-1 text-2xl font-bold">{cards.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Due
              </p>
              <p className="mt-1 text-2xl font-bold">{dueCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Contexts
              </p>
              <p className="mt-1 text-2xl font-bold">{contextCount}</p>
            </div>
          </CardContent>
        </Card>
        <ImportPanel />
        <AddCardPanel />
        <ConsistencyWell cards={cards} />
      </aside>
      <div className="grid gap-6">
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setCollectionScope("active")}
            size="sm"
            type="button"
            variant={collectionScope === "active" ? "default" : "outline"}
          >
            Active cards
          </Button>
          <Button
            onClick={() => setCollectionScope("archived")}
            size="sm"
            type="button"
            variant={collectionScope === "archived" ? "default" : "outline"}
          >
            Archived cards
          </Button>
        </div>
        <ReviewQueue
          archived={collectionScope === "archived"}
          cards={cards}
          key={collectionScope}
        />
      </div>
    </main>
  );
}
