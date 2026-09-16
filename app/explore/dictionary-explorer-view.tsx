"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  Compass,
  History,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useCanopyTheme } from "@/app/providers";
import { queryKeys } from "@/lib/query-keys";
import type {
  DictionarySearchResult,
  DictionaryDiscoveryResult,
  DictionarySearchScope,
} from "@/lib/dictionary";

const scopes: { value: DictionarySearchScope; label: string }[] = [
  { value: "all", label: "Best match" },
  { value: "chinese", label: "Chinese" },
  { value: "pinyin", label: "Pinyin" },
  { value: "english", label: "English" },
];

type ExplorerEntry = DictionarySearchResult | DictionaryDiscoveryResult;
type LookupHistoryEntry = {
  id: string;
  query: string;
  scope: DictionarySearchScope;
};

async function fetchLookupHistory(): Promise<LookupHistoryEntry[]> {
  const response = await fetch("/api/dictionary/history");
  if (!response.ok) throw new Error("Dictionary history could not be loaded.");
  const payload = (await response.json()) as {
    entries: LookupHistoryEntry[];
  };
  return payload.entries;
}

async function fetchDictionarySearch(
  query: string,
  scope: DictionarySearchScope,
  saveHistory: boolean,
): Promise<DictionarySearchResult[]> {
  const response = await fetch("/api/dictionary/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, scope, saveHistory }),
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as {
    entries: DictionarySearchResult[];
  };
  return payload.entries;
}

async function fetchDictionaryDiscoveries(): Promise<
  DictionaryDiscoveryResult[]
> {
  const response = await fetch("/api/dictionary/discover");
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as {
    entries: DictionaryDiscoveryResult[];
  };
  return payload.entries;
}

function DictionaryEntryCard({
  entry,
  isAdding,
  onAdd,
}: {
  entry: ExplorerEntry;
  isAdding: boolean;
  onAdd: (entry: ExplorerEntry) => void;
}) {
  const { chineseScript } = useCanopyTheme();
  const sharedWith = "sharedWith" in entry ? entry.sharedWith : [];
  const primaryText =
    chineseScript === "traditional" ? entry.traditional : entry.simplified;
  const alternateText =
    chineseScript === "traditional" ? entry.simplified : entry.traditional;
  const alternateLabel =
    chineseScript === "traditional" ? "Simplified" : "Traditional";
  return (
    <article className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold">{primaryText}</h2>
          {alternateText !== primaryText ? (
            <p className="text-sm text-muted-foreground">
              {alternateLabel}: {alternateText}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">{entry.pinyin}</p>
        </div>
        {entry.card ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <BookOpen className="size-4" /> In your collection
          </span>
        ) : (
          <Button
            disabled={isAdding}
            onClick={() => onAdd(entry)}
            size="sm"
            type="button"
          >
            <Plus /> {isAdding ? "Adding…" : "Add to collection"}
          </Button>
        )}
      </div>
      {sharedWith.length ? (
        <p className="mt-3 text-xs font-semibold text-primary">
          Shares a character with {sharedWith.join(", ")}
        </p>
      ) : null}
      <p className="mt-4 text-sm leading-6">{entry.definitions.join("; ")}</p>
    </article>
  );
}

export function DictionaryExplorerView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasExploredCompounds, setHasExploredCompounds] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<DictionarySearchScope>("all");
  const [addingEntryId, setAddingEntryId] = useState<string | null>(null);
  const [submittedSearch, setSubmittedSearch] = useState<{
    query: string;
    scope: DictionarySearchScope;
  } | null>(null);
  const historyQuery = useQuery({
    queryKey: queryKeys.dictionaryHistory,
    queryFn: fetchLookupHistory,
  });
  const searchQuery = useQuery({
    queryKey: queryKeys.dictionarySearch(
      submittedSearch?.scope ?? "all",
      submittedSearch?.query ?? "",
    ),
    queryFn: () => {
      if (!submittedSearch) return Promise.resolve([]);
      return fetchDictionarySearch(
        submittedSearch.query,
        submittedSearch.scope,
        false,
      );
    },
    enabled: Boolean(submittedSearch),
  });
  const discoveriesQuery = useQuery({
    queryKey: queryKeys.dictionaryDiscoveries,
    queryFn: fetchDictionaryDiscoveries,
    enabled: isConnectionsOpen && hasExploredCompounds,
  });
  const history = historyQuery.data ?? [];
  const entries = searchQuery.data ?? [];
  const discoveries = discoveriesQuery.data ?? [];
  const isSearching = isSubmittingSearch || searchQuery.isFetching;
  const isDiscovering = discoveriesQuery.isFetching;
  const feedbackMessage =
    message ||
    (searchQuery.isError
      ? "Dictionary search could not be completed. Please try again."
      : discoveriesQuery.isError
        ? "Related forms could not be found. Please try again."
        : submittedSearch && !isSearching && entries.length === 0
          ? "No active dictionary entries matched that search."
          : "");

  async function searchDictionary(
    searchScope = scope,
    searchQuery = query,
    saveHistory = true,
  ) {
    const term = searchQuery.trim();
    if (!term) {
      setMessage("Enter Chinese, pinyin, or an English gloss to search.");
      return;
    }
    setIsSubmittingSearch(true);
    setMessage("");
    try {
      if (saveHistory) {
        const entries = await fetchDictionarySearch(term, searchScope, true);
        queryClient.setQueryData(
          queryKeys.dictionarySearch(searchScope, term),
          entries,
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dictionaryHistory,
        });
      }
      setSubmittedSearch({ query: term, scope: searchScope });
    } catch {
      setMessage("Dictionary search could not be completed. Please try again.");
    } finally {
      setIsSubmittingSearch(false);
    }
  }

  async function clearHistory() {
    const response = await fetch("/api/dictionary/history", {
      method: "DELETE",
    });
    if (response.ok) {
      queryClient.setQueryData(queryKeys.dictionaryHistory, []);
    }
  }

  async function discoverCompounds() {
    setMessage("");
    if (hasExploredCompounds) {
      await discoveriesQuery.refetch();
      return;
    }
    setHasExploredCompounds(true);
  }

  async function addToCollection(entry: ExplorerEntry) {
    setAddingEntryId(entry.entryId);
    try {
      const response = await fetch("/api/dictionary/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.entryId }),
      });
      if (!response.ok) throw new Error(await response.text());
      queryClient.setQueriesData<DictionarySearchResult[]>(
        { queryKey: queryKeys.dictionarySearchRoot },
        (current) =>
          current?.map((candidate) =>
            candidate.entryId === entry.entryId
              ? {
                  ...candidate,
                  card: {
                    id: candidate.entryId,
                    phoneticReading: candidate.pinyin.split(/\s+/),
                    definitions: candidate.definitions,
                  },
                }
              : candidate,
          ),
      );
      queryClient.setQueryData<DictionaryDiscoveryResult[]>(
        queryKeys.dictionaryDiscoveries,
        (current) =>
          current?.map((candidate) =>
            candidate.entryId === entry.entryId
              ? {
                  ...candidate,
                  card: {
                    id: candidate.entryId,
                    phoneticReading: candidate.pinyin.split(/\s+/),
                    definitions: candidate.definitions,
                  },
                }
              : candidate,
          ),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overstorySeeds });
      void queryClient.invalidateQueries({ queryKey: queryKeys.understorySeeds });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dictionaryDiscoveries,
      });
      toast(`${entry.simplified} added to your collection.`);
    } catch {
      setMessage("That entry could not be added. Please try again.");
    } finally {
      setAddingEntryId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">
          Explore Chinese
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold md:text-4xl">
          Dictionary explorer
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search the active CC-CEDICT release by Chinese form, pinyin, or
          English gloss. Best match prioritizes exact forms and definitions
          before partial matches. Exploring does not affect review until you add
          an entry to your collection.
        </p>
      </header>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void searchDictionary();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 福利, fuli, welfare"
            value={query}
          />
        </div>
        <Button disabled={isSearching} type="submit">
          {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
          {isSearching ? "Searching…" : "Search dictionary"}
        </Button>
      </form>
      <div aria-label="Search matches" className="flex flex-wrap gap-2">
        {scopes.map((option) => (
          <Button
            aria-pressed={scope === option.value}
            key={option.value}
            onClick={() => {
              setScope(option.value);
              if (query.trim())
                void searchDictionary(option.value, query, false);
            }}
            size="sm"
            type="button"
            variant={scope === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {history.length ? (
        <section
          aria-label="Recent dictionary searches"
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-serif text-lg font-bold">
              <History className="size-4" /> Recent searches
            </h2>
            <Button
              onClick={() => void clearHistory()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 /> Clear
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {history.map((entry) => (
              <Button
                key={entry.id}
                onClick={() => {
                  setQuery(entry.query);
                  setScope(entry.scope);
                  void searchDictionary(entry.scope, entry.query, false);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {entry.query}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
      {feedbackMessage ? (
        <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          {feedbackMessage}
        </p>
      ) : null}
      <div className="space-y-3">
        {entries.map((entry) => (
          <DictionaryEntryCard
            entry={entry}
            isAdding={addingEntryId === entry.entryId}
            key={entry.entryId}
            onAdd={(candidate) => void addToCollection(candidate)}
          />
        ))}
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">
              Character connections
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Optional literal shared-character exploration from recent active
              cards.
            </p>
          </div>
          <Button
            aria-expanded={isConnectionsOpen}
            onClick={() => setIsConnectionsOpen((current) => !current)}
            type="button"
            variant="outline"
          >
            <ChevronDown
              className={
                isConnectionsOpen
                  ? "rotate-180 transition-transform"
                  : "transition-transform"
              }
            />
            {isConnectionsOpen ? "Hide" : "Explore"}
          </Button>
        </div>
        {isConnectionsOpen ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Forms share at least one literal Chinese character. They may be
              unrelated in meaning or level.
            </p>
            <Button
              className="mt-3"
              disabled={isDiscovering}
              onClick={() => void discoverCompounds()}
              type="button"
              variant="outline"
            >
              {isDiscovering ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Compass />
              )}
              {isDiscovering ? "Finding…" : "Find connections"}
            </Button>
            {hasExploredCompounds &&
            !isDiscovering &&
            !discoveriesQuery.isError &&
            !discoveries.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Add active Chinese cards first, then come back to explore
                character connections.
              </p>
            ) : null}
            {discoveries.length ? (
              <div className="mt-4 space-y-3">
                {discoveries.map((entry) => (
                  <DictionaryEntryCard
                    entry={entry}
                    isAdding={addingEntryId === entry.entryId}
                    key={entry.entryId}
                    onAdd={(candidate) => void addToCollection(candidate)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
