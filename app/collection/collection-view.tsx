"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { generateContextAction, removeContextAction } from "@/app/actions";
import {
  contextGeneratedLabel,
  dueLabel,
  growthLabel,
} from "@/components/canopy/card-utils";
import type { WorkspaceCard } from "@/components/canopy/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MAX_EXAMPLE_CONTEXTS } from "@/lib/example-contexts";

type Scope = "active" | "archived";

type CollectionResponse = {
  cards: WorkspaceCard[];
  total: number;
  page: number;
  pageSize: number;
};

export function CollectionView({
  initialCards,
  initialTotal,
}: {
  initialCards: WorkspaceCard[];
  initialTotal: number;
}) {
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>("active");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CollectionResponse>({
    cards: initialCards,
    total: initialTotal,
    page: 1,
    pageSize: 20,
  });
  const [editingCard, setEditingCard] = useState<WorkspaceCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<WorkspaceCard | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const loadPage = useCallback(
    async (nextScope = scope, nextQuery = query, nextPage = page) => {
      const response = await fetch(
        `/api/cards?scope=${nextScope}&query=${encodeURIComponent(nextQuery)}&page=${nextPage}`,
      );
      if (!response.ok) {
        setActionMessage(
          "Your collection could not be refreshed. Please try again.",
        );
        return;
      }
      setResult((await response.json()) as CollectionResponse);
    },
    [page, query, scope],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/cards?scope=${scope}&query=${encodeURIComponent(query)}&page=${page}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Collection refresh failed.");
        }
        return response.json() as Promise<CollectionResponse>;
      })
      .then(setResult)
      .catch(() => {
        if (!controller.signal.aborted) {
          setActionMessage(
            "Your collection could not be refreshed. Please try again.",
          );
        }
      });
    return () => controller.abort();
  }, [page, query, scope]);

  async function updateCard(
    cardId: string,
    body: Record<string, unknown>,
    method: "PATCH" | "DELETE" = "PATCH",
  ) {
    setActionMessage("");
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
    return true;
  }

  async function saveCardEdit(formData: FormData) {
    if (!editingCard) return;
    const targetText = String(formData.get("targetText") ?? "").trim();
    const phoneticReading = String(formData.get("phoneticReading") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    const definitions = String(formData.get("definitions") ?? "")
      .split(";")
      .map((definition) => definition.trim())
      .filter(Boolean);

    if (!targetText || definitions.length === 0) {
      setActionMessage("Add a word or phrase and at least one definition.");
      return;
    }
    if (
      await updateCard(editingCard.id, {
        targetText,
        phoneticReading,
        definitions,
      })
    ) {
      setResult((current) => ({
        ...current,
        cards: current.cards.map((card) =>
          card.id === editingCard.id
            ? { ...card, targetText, phoneticReading, definitions }
            : card,
        ),
      }));
      setEditingCard(null);
      toast("Card details saved.");
    }
  }

  async function moveCard(card: WorkspaceCard) {
    if (await updateCard(card.id, { archived: scope === "active" })) {
      setResult((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
        total: Math.max(0, current.total - 1),
      }));
      toast(
        scope === "active"
          ? "Card archived."
          : "Card restored to your active collection.",
      );
    }
  }

  async function deleteSelectedCard() {
    if (!deletingCard) return;
    if (await updateCard(deletingCard.id, {}, "DELETE")) {
      setResult((current) => ({
        ...current,
        cards: current.cards.filter((card) => card.id !== deletingCard.id),
        total: Math.max(0, current.total - 1),
      }));
      setDeletingCard(null);
      toast("Card permanently deleted.");
    }
  }

  async function runContextAction(
    action: (formData: FormData) => Promise<void>,
    formData: FormData,
  ) {
    setActionMessage("");
    await action(formData);
    await loadPage();
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">
          Your grove
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold md:text-4xl">
          Collection
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Search, browse, and care for every card in your private library.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-2">
          {(["active", "archived"] as const).map((nextScope) => (
            <Button
              key={nextScope}
              onClick={() => {
                setScope(nextScope);
                setPage(1);
              }}
              type="button"
              variant={scope === nextScope ? "default" : "outline"}
            >
              {nextScope === "active" ? "Active" : "Archived"}
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search words, readings, or definitions"
            value={query}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {result.total} card{result.total === 1 ? "" : "s"}
      </p>
      <div className="space-y-2">
        {result.cards.map((card) => (
          <details
            className="rounded-xl border border-border bg-card"
            key={card.id}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-primary">
                  {growthLabel(card)} · {dueLabel(card)}
                </p>
                <h2 className="mt-1 truncate font-serif text-xl font-bold">
                  {card.targetText}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {card.phoneticReading.join(" ") || card.definitions[0]}
                </p>
              </div>
              <Badge>{card.languageCode} · Details</Badge>
            </summary>
            <div className="border-t border-border p-4">
              <p className="text-sm leading-6">{card.definitions.join("; ")}</p>
              {card.aiExampleContexts.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {card.aiExampleContexts.map((context, contextIndex) => (
                    <div
                      className="rounded-lg border border-border bg-background p-3 text-sm"
                      key={`${context.sentence}-${contextIndex}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Context {contextIndex + 1} ·{" "}
                          {contextGeneratedLabel(context.generatedAt)}
                        </p>
                        <Button
                          aria-label={`Remove context ${contextIndex + 1}`}
                          onClick={() => {
                            const formData = new FormData();
                            formData.set("cardId", card.id);
                            formData.set("contextIndex", String(contextIndex));
                            void runContextAction(
                              removeContextAction,
                              formData,
                            );
                          }}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                      <p className="mt-2 font-semibold">{context.sentence}</p>
                      {context.phonetic ? (
                        <p className="mt-1 text-muted-foreground">
                          {context.phonetic}
                        </p>
                      ) : null}
                      {context.translation ? (
                        <p className="mt-1">{context.translation}</p>
                      ) : null}
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
                  onClick={() => void moveCard(card)}
                  type="button"
                  variant="outline"
                >
                  {scope === "active" ? <Archive /> : <ArchiveRestore />}
                  {scope === "active" ? "Archive" : "Restore"}
                </Button>
                <Button
                  onClick={() => setDeletingCard(card)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 /> Delete
                </Button>
                {scope === "active" ? (
                  <Button
                    disabled={
                      card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
                    }
                    onClick={() => {
                      const formData = new FormData();
                      formData.set("cardId", card.id);
                      void runContextAction(generateContextAction, formData);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Sparkles />
                    {card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
                      ? "Max contexts"
                      : card.aiExampleContexts.length > 0
                        ? "Generate another"
                        : "Generate context"}
                  </Button>
                ) : null}
              </div>
            </div>
          </details>
        ))}
        {result.cards.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No {scope} cards match this search.
          </p>
        ) : null}
      </div>
      {actionMessage ? (
        <p
          className="rounded-lg border border-primary/40 bg-card p-3 text-sm"
          role="status"
        >
          {actionMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          disabled={page === 1}
          onClick={() => setPage((current) => current - 1)}
          type="button"
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
          type="button"
          variant="outline"
        >
          Next
        </Button>
      </div>

      <Dialog
        onOpenChange={(open) => !open && setEditingCard(null)}
        open={Boolean(editingCard)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>
              These details belong to your collection. Reference dictionary data
              remains separate.
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
        onOpenChange={(open) => !open && setDeletingCard(null)}
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
    </main>
  );
}
