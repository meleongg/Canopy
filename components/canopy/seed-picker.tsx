"use client";

import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  cardMatchesSearch,
  filterSeedCards,
  seedFilterLabels,
  type SeedFilter,
} from "@/components/canopy/card-utils";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SeedPicker({
  title,
  description,
  cards,
  selectedIds,
  setSelectedIds,
  min,
  max = 7,
}: {
  title: string;
  description: string;
  cards: WorkspaceCard[];
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  min: number;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SeedFilter>("recent");
  const selectedCards = useMemo(
    () => cards.filter((card) => selectedIds.includes(card.id)),
    [cards, selectedIds],
  );
  const visibleCards = useMemo(
    () =>
      filterSeedCards(cards, filter)
        .filter((card) => cardMatchesSearch(card, query))
        .slice(0, 16),
    [cards, filter, query],
  );

  function toggleSeed(cardId: string) {
    setSelectedIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }

      if (current.length >= max) {
        return current;
      }

      return [...current, cardId];
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge>
            {selectedIds.length}/{max}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {selectedCards.length ? (
            selectedCards.map((card) => (
              <Button
                className="max-w-full"
                key={card.id}
                onClick={() =>
                  setSelectedIds((current) =>
                    current.filter((id) => id !== card.id),
                  )
                }
                size="sm"
                type="button"
                variant="secondary"
              >
                <span className="truncate">{card.targetText}</span>
                <X />
              </Button>
            ))
          ) : (
            <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Select at least {min} seed{min > 1 ? "s" : ""}.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="h-10 border-0 px-0 focus-visible:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search seeds"
            value={query}
          />
        </div>

        <div className="mt-3 inline-flex rounded-lg border border-border bg-background p-1 text-sm">
          {(["due", "weak", "recent"] as SeedFilter[]).map((nextFilter) => (
            <Button
              className={cn("h-8", filter === nextFilter && "bg-primary")}
              key={nextFilter}
              onClick={() => setFilter(nextFilter)}
              size="sm"
              type="button"
              variant={filter === nextFilter ? "default" : "ghost"}
            >
              {seedFilterLabels[nextFilter]}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {cards.length === 0 ? (
            <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
              No vocabulary rows found. Import a log or run the seed script.
            </p>
          ) : null}
          {cards.length > 0 && visibleCards.length === 0 ? (
            <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
              No seeds match this filter.
            </p>
          ) : null}
          {visibleCards.map((card) => {
            const selected = selectedIds.includes(card.id);

            return (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm transition hover:border-primary",
                  selected && "border-primary",
                )}
                key={card.id}
              >
                <input
                  checked={selected}
                  onChange={() => toggleSeed(card.id)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {card.targetText}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {card.definitions.join(", ")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
