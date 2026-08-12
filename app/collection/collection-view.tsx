"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Archive, ArchiveRestore, Search } from "lucide-react";
import type { WorkspaceCard } from "@/components/canopy/types";
import { dueLabel, growthLabel } from "@/components/canopy/card-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [scope, setScope] = useState<"active" | "archived">("active");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CollectionResponse>({
    cards: initialCards,
    total: initialTotal,
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    if (scope === "active" && !query && page === 1) return;
    const controller = new AbortController();
    void fetch(
      `/api/cards?scope=${scope}&query=${encodeURIComponent(query)}&page=${page}`,
      { signal: controller.signal },
    )
      .then((response) => response.json() as Promise<CollectionResponse>)
      .then(setResult);
    return () => controller.abort();
  }, [scope, query, page]);

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
          <Button
            onClick={() => {
              setScope("active");
              setPage(1);
            }}
            type="button"
            variant={scope === "active" ? "default" : "outline"}
          >
            Active
          </Button>
          <Button
            onClick={() => {
              setScope("archived");
              setPage(1);
            }}
            type="button"
            variant={scope === "archived" ? "default" : "outline"}
          >
            Archived
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search words or phrases"
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
              <Button
                className="mt-4"
                onClick={async () => {
                  const response = await fetch(`/api/cards/${card.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ archived: scope === "active" }),
                  });
                  if (response.ok) {
                    setResult((current) => ({
                      ...current,
                      cards: current.cards.filter(
                        (item) => item.id !== card.id,
                      ),
                      total: Math.max(0, current.total - 1),
                    }));
                  }
                }}
                type="button"
                variant="outline"
              >
                {scope === "active" ? <Archive /> : <ArchiveRestore />}
                {scope === "active" ? "Archive" : "Restore"}
              </Button>
            </div>
          </details>
        ))}
        {result.cards.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No {scope} cards match this search.
          </p>
        ) : null}
      </div>
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
    </main>
  );
}
