"use client";

import { useState } from "react";
import { BookOpen, LoaderCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type {
  DictionarySearchResult,
  DictionarySearchScope,
} from "@/lib/dictionary";

const scopes: { value: DictionarySearchScope; label: string }[] = [
  { value: "all", label: "Best match" },
  { value: "chinese", label: "Chinese" },
  { value: "pinyin", label: "Pinyin" },
  { value: "english", label: "English" },
];

export function DictionaryExplorerView() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<DictionarySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<DictionarySearchScope>("all");
  const [addingEntryId, setAddingEntryId] = useState<string | null>(null);

  async function searchDictionary(searchScope = scope) {
    const term = query.trim();
    if (!term) {
      setMessage("Enter Chinese, pinyin, or an English gloss to search.");
      return;
    }
    setIsSearching(true);
    setMessage("");
    try {
      const response = await fetch("/api/dictionary/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term, scope: searchScope }),
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as {
        entries: DictionarySearchResult[];
      };
      setEntries(payload.entries);
      if (!payload.entries.length) setMessage("No active dictionary entries matched that search.");
    } catch {
      setMessage("Dictionary search could not be completed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function addToCollection(entry: DictionarySearchResult) {
    setAddingEntryId(entry.entryId);
    try {
      const response = await fetch("/api/dictionary/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.entryId }),
      });
      if (!response.ok) throw new Error(await response.text());
      setEntries((current) =>
        current.map((candidate) =>
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
      toast(`${entry.simplified} added to your collection.`);
    } catch {
      setMessage("That entry could not be added. Please try again.");
    } finally {
      setAddingEntryId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">Explore Chinese</p>
        <h1 className="mt-1 font-serif text-3xl font-bold md:text-4xl">Dictionary explorer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search the active CC-CEDICT release by Chinese form, pinyin, or English gloss. Best match prioritizes exact forms and definitions before partial matches. Exploring does not affect review until you add an entry to your collection.
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
              if (query.trim()) void searchDictionary(option.value);
            }}
            size="sm"
            type="button"
            variant={scope === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {message ? <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">{message}</p> : null}
      <div className="space-y-3">
        {entries.map((entry) => (
          <article className="rounded-xl border border-border bg-background p-5" key={entry.entryId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-bold">{entry.simplified}</h2>
                {entry.traditional !== entry.simplified ? <p className="text-sm text-muted-foreground">Traditional: {entry.traditional}</p> : null}
                <p className="mt-1 text-sm text-muted-foreground">{entry.pinyin}</p>
              </div>
              {entry.card ? (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen className="size-4" /> In your collection</span>
              ) : (
                <Button disabled={addingEntryId === entry.entryId} onClick={() => void addToCollection(entry)} size="sm" type="button">
                  <Plus /> {addingEntryId === entry.entryId ? "Adding…" : "Add to collection"}
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm leading-6">{entry.definitions.join("; ")}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
