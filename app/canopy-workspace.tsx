"use client";

import Image from "next/image";
import {
  type Dispatch,
  type SetStateAction,
  useActionState,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  FileText,
  PencilLine,
  Search,
  Send,
  Sparkles,
  TreePine,
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
import logoDark from "@/app/assets/icons/canopy-logo-dark.svg";
import logoLight from "@/app/assets/icons/canopy-logo-light.svg";
import {
  type ExampleContext,
  MAX_EXAMPLE_CONTEXTS,
} from "@/lib/example-contexts";
import { cn } from "@/lib/utils";

export type WorkspaceCard = {
  id: string;
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  interval: number;
  repetition: number;
  easiness: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  aiExampleContexts: ExampleContext[];
};

type ImportDraft = {
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  exampleContexts: ExampleContext[];
  linguisticMeta?: {
    alternatives?: string[];
    partOfSpeech?: string[];
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SeedFilter = "due" | "weak" | "recent";

const initialImportState = {
  ok: true,
  message: "Paste a tab-separated log or upload a .txt file.",
};

const initialAddState = {
  ok: true,
  message: "Add one card directly.",
};

const importExamples: Record<string, string> = {
  "zh-CN": "医院\thospital\n会议\tmeeting; conference",
  "zh-HK": "飲茶\tyum2 caa4\tdrink tea; dim sum\n附近\tnearby",
  "fr-FR": "hôpital\thospital\nréunion\tmeeting",
  und: "kinship\tfamily relationship\nthreshold\tstarting point",
};

const reviewLabels: Record<number, string> = {
  2: "Hard",
  3: "Pass",
  4: "Good",
  5: "Easy",
};

const seedFilterLabels: Record<SeedFilter, string> = {
  due: "Due",
  weak: "Weak",
  recent: "Recent",
};

function growthLabel(card: WorkspaceCard) {
  if (card.repetition >= 5 || card.interval >= 30) {
    return "Deep roots";
  }
  if (card.repetition > 0) {
    return "Sprouted leaf";
  }
  return "Seedling";
}

function dueLabel(card: WorkspaceCard) {
  const due = new Date(card.nextReviewAt);
  if (due <= new Date()) {
    return "Due now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(due);
}

function contextGeneratedLabel(generatedAt: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(generatedAt));
}

function cardMatchesSearch(card: WorkspaceCard, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    card.targetText,
    card.languageCode,
    card.phoneticReading.join(" "),
    card.definitions.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function filterSeedCards(cards: WorkspaceCard[], filter: SeedFilter) {
  const now = new Date();

  if (filter === "due") {
    return cards.filter((card) => new Date(card.nextReviewAt) <= now);
  }

  if (filter === "weak") {
    return cards.filter(
      (card) => card.easiness <= 240 || card.repetition === 0,
    );
  }

  return [...cards]
    .sort((a, b) => {
      const left = new Date(a.lastReviewedAt ?? a.nextReviewAt).getTime();
      const right = new Date(b.lastReviewedAt ?? b.nextReviewAt).getTime();
      return right - left;
    })
    .slice(0, 12);
}

function SeedPicker({
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
  const selectedCards = cards.filter((card) => selectedIds.includes(card.id));
  const visibleCards = filterSeedCards(cards, filter)
    .filter((card) => cardMatchesSearch(card, query))
    .slice(0, 12);

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

  function clearSelectedSeed(cardId: string) {
    setSelectedIds((current) => current.filter((id) => id !== cardId));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-lg border border-border px-2 py-1 text-xs font-semibold">
          {selectedIds.length}/{max}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedCards.length > 0 ? (
          selectedCards.map((card) => (
            <button
              className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-accent hover:text-[#2C3539]"
              key={card.id}
              onClick={() => clearSelectedSeed(card.id)}
              title={`Remove ${card.targetText}`}
              type="button"
            >
              <span className="truncate">{card.targetText}</span>
              <X className="size-3" />
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Select at least {min} seed{min > 1 ? "s" : ""}.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search seeds"
          value={query}
        />
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-border bg-background p-1 text-sm">
        {(["due", "weak", "recent"] as SeedFilter[]).map((nextFilter) => (
          <button
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 transition hover:bg-accent hover:text-[#2C3539]",
              filter === nextFilter && "bg-primary text-primary-foreground",
            )}
            key={nextFilter}
            onClick={() => setFilter(nextFilter)}
            type="button"
          >
            {seedFilterLabels[nextFilter]}
          </button>
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
              <span className="shrink-0 text-xs text-muted-foreground">
                EF {(card.easiness / 100).toFixed(2)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SelectField({
  id,
  name,
  defaultValue,
  value,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="relative mt-2">
      <select
        className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none transition focus:border-primary"
        id={id}
        name={name}
        defaultValue={value ? undefined : defaultValue}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="zh-CN">Mandarin</option>
        <option value="zh-HK">Cantonese</option>
        <option value="fr-FR">French</option>
        <option value="und">Agnostic</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function CanopyWorkspace({ cards }: { cards: WorkspaceCard[] }) {
  const [importState, importAction, importPending] = useActionState(
    createFlashcardsFromPreviewAction,
    initialImportState,
  );
  const [addState, addAction, addPending] = useActionState(
    addFlashcardAction,
    initialAddState,
  );
  const [storySeedIds, setStorySeedIds] = useState<string[]>(
    cards.slice(0, 3).map((card) => card.id),
  );
  const [chatSeedIds, setChatSeedIds] = useState<string[]>(
    cards.slice(0, 3).map((card) => card.id),
  );
  const [story, setStory] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [importLanguage, setImportLanguage] = useState("zh-CN");
  const [importRawText, setImportRawText] = useState("");
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [importPreviewMessage, setImportPreviewMessage] = useState("");
  const [importPreviewPending, setImportPreviewPending] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"due" | "all">("due");
  const [showSm2Help, setShowSm2Help] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bramble is ready. Choose seeds, then step into a low-pressure dialogue.",
    },
  ]);
  const [isPending, startTransition] = useTransition();

  const storySeedCards = useMemo(
    () => cards.filter((card) => storySeedIds.includes(card.id)),
    [cards, storySeedIds],
  );
  const chatSeedCards = useMemo(
    () => cards.filter((card) => chatSeedIds.includes(card.id)),
    [cards, chatSeedIds],
  );
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;
  const queueCards = useMemo(() => {
    if (queueFilter === "all") {
      return cards;
    }

    return cards.filter((card) => new Date(card.nextReviewAt) <= new Date());
  }, [cards, queueFilter]);

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
        body: JSON.stringify({
          rawText,
          languageCode: importLanguage,
        }),
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

  async function streamTextResponse(
    response: Response,
    onToken: (token: string) => void,
  ) {
    const reader = response.body?.getReader();
    if (!reader) {
      onToken(await response.text());
      return;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      onToken(decoder.decode(value));
    }
  }

  function generateSandbox() {
    startTransition(async () => {
      setStory("");
      const response = await fetch("/api/generate-sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeds: storySeedCards }),
      });

      if (!response.ok) {
        setStory(await response.text());
        return;
      }

      await streamTextResponse(response, (token) =>
        setStory((current) => current + token),
      );
    });
  }

  function sendChatMessage() {
    const content = chatInput.trim();
    if (!content || chatSeedCards.length === 0) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...chatMessages.filter(
        (message) =>
          message.content !==
          "Bramble is ready. Choose seeds, then step into a low-pressure dialogue.",
      ),
      { role: "user", content },
    ];
    setChatInput("");
    setChatMessages([...nextMessages, { role: "assistant", content: "" }]);

    startTransition(async () => {
      const response = await fetch("/api/generate-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seeds: chatSeedCards,
          setting: "a quiet airport cafe",
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        setChatMessages([
          ...nextMessages,
          { role: "assistant", content: error },
        ]);
        return;
      }

      await streamTextResponse(response, (token) => {
        setChatMessages((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `${last.content}${token}`,
          };
          return copy;
        });
      });
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card/70">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 md:grid-cols-[1fr_360px] md:px-8">
          <div className="flex flex-col justify-end gap-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                <Image
                  alt="Canopy"
                  className="block dark:hidden"
                  height={44}
                  src={logoLight}
                  width={44}
                  priority
                />
                <Image
                  alt="Canopy"
                  className="hidden dark:block"
                  height={44}
                  src={logoDark}
                  width={44}
                  priority
                />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-primary">
                  Canopy
                </p>
                <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
                  Vocabulary grows by use.
                </h1>
              </div>
            </div>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Import raw dictionary logs, tend a lightweight review queue, and
              turn chosen words into story and dialogue practice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            {[
              ["Cards", cards.length],
              ["Due", dueCount],
            ].map(([label, value]) => (
              <div
                className="rounded-xl border border-border bg-background p-4"
                key={label}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 md:grid-cols-[360px_1fr] md:px-8">
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Import</h2>
              <Upload className="size-5 text-primary" />
            </div>
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="languageCode"
            >
              Language
            </label>
            <SelectField
              id="languageCode"
              name="languageCode"
              defaultValue="zh-CN"
              value={importLanguage}
              onChange={setImportLanguage}
            />
            <label className="mt-4 block text-sm font-medium" htmlFor="rawText">
              Raw text
            </label>
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-lg border border-dashed border-border bg-background p-3 text-sm leading-6 outline-none transition focus:border-primary"
              id="rawText"
              name="rawText"
              onChange={(event) => setImportRawText(event.target.value)}
              placeholder={importExamples[importLanguage]}
              value={importRawText}
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Paste rows as word, definition or word, reading, definition. Tabs
              and simple CSV are both supported.
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
              <input
                className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
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
                Drag and drop a Pleco export or .txt vocabulary list here.
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              You can add dictionary history or bookmark exports from tools like
              Pleco, WordReference, or a plain .txt vocabulary list.
            </p>
            <button
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={importPreviewPending}
              onClick={previewImport}
              type="button"
            >
              <Search className="size-4" />
              Preview Flashcards
            </button>
            <p
              className={cn(
                "mt-3 text-sm",
                importState.ok ? "text-muted-foreground" : "text-red-700",
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
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                    <textarea
                      className="mt-1 min-h-24 w-full resize-y rounded-lg border border-border bg-card p-3 text-sm leading-6 outline-none transition focus:border-primary"
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
                              <button
                                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                                onClick={() =>
                                  updateImportDraft(draftIndex, (current) => ({
                                    ...current,
                                    exampleContexts:
                                      current.exampleContexts.filter(
                                        (_item, nextIndex) =>
                                          nextIndex !== contextIndex,
                                      ),
                                  }))
                                }
                                title="Remove context"
                                type="button"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                            <input
                              className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none transition focus:border-primary"
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
                            <input
                              className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none transition focus:border-primary"
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
                            <textarea
                              className="mt-2 min-h-16 w-full resize-y rounded-lg border border-border bg-background p-2 text-sm leading-5 outline-none transition focus:border-primary"
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
                  <button
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={importPending}
                    type="submit"
                  >
                    <Upload className="size-4" />
                    Create Flashcards
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <form
            action={addAction}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Add Card</h2>
              <PencilLine className="size-5 text-primary" />
            </div>
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="manualLanguageCode"
            >
              Language
            </label>
            <SelectField
              id="manualLanguageCode"
              name="manualLanguageCode"
              defaultValue="zh-CN"
            />
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="targetText"
            >
              Word or phrase
            </label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              id="targetText"
              name="targetText"
              placeholder="机场"
            />
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="phoneticReading"
            >
              Reading
            </label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
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
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
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
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none transition focus:border-primary"
              id="exampleContext"
              name="exampleContext"
              placeholder="Optional example sentence"
            />
            <button
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={addPending}
              type="submit"
            >
              <FileText className="size-4" />
              Add Flashcard
            </button>
            <p
              className={cn(
                "mt-3 text-sm",
                addState.ok ? "text-muted-foreground" : "text-red-700",
              )}
            >
              {addState.message}
            </p>
          </form>

          <SeedPicker
            title="The Overstory Seeds"
            description="Choose 3 to 7 cards that will blossom into The Overstory Sandbox."
            cards={cards}
            selectedIds={storySeedIds}
            setSelectedIds={setStorySeedIds}
            min={3}
          />

          <SeedPicker
            title="The Understory Seeds"
            description="Choose 1 to 7 cards that Bramble should weave into The Understory Chat."
            cards={cards}
            selectedIds={chatSeedIds}
            setSelectedIds={setChatSeedIds}
            min={1}
          />
        </aside>

        <div className="grid gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold">
                    The Sprouting Queue
                  </h2>
                  <button
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                    onClick={() => setShowSm2Help(true)}
                    title="How review scheduling works"
                    type="button"
                  >
                    <CircleHelp className="size-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cards are sorted by next review date. Review buttons update
                  their next interval.
                </p>
              </div>
              <Droplets className="size-5 text-primary" />
            </div>
            <div className="mt-4 inline-flex rounded-lg border border-border bg-background p-1 text-sm">
              <button
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 transition hover:bg-accent hover:text-[#2C3539]",
                  queueFilter === "due" && "bg-primary text-primary-foreground",
                )}
                onClick={() => setQueueFilter("due")}
                type="button"
              >
                Due ({dueCount})
              </button>
              <button
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 transition hover:bg-accent hover:text-[#2C3539]",
                  queueFilter === "all" && "bg-primary text-primary-foreground",
                )}
                onClick={() => setQueueFilter("all")}
                type="button"
              >
                All ({cards.length})
              </button>
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
                    <span
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                      title="Ease factor: higher means the card grows longer review intervals after successful reviews."
                    >
                      EF {(card.easiness / 100).toFixed(2)}
                    </span>
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
                            <form action={removeContextAction}>
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
                              <button
                                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                                title="Remove context"
                                type="submit"
                              >
                                <X className="size-3" />
                              </button>
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
                    <p className="basis-full text-xs text-muted-foreground">
                      Review: 2 Hard · 3 Pass · 4 Good · ✓ Easy
                    </p>
                    {[2, 3, 4, 5].map((quality) => (
                      <form action={reviewCardAction} key={quality}>
                        <input name="cardId" type="hidden" value={card.id} />
                        <input name="quality" type="hidden" value={quality} />
                        <button
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                          title={`Review quality ${quality}: ${reviewLabels[quality]}`}
                          type="submit"
                        >
                          {quality === 5 ? (
                            <Check className="size-4" />
                          ) : (
                            quality
                          )}
                        </button>
                      </form>
                    ))}
                    <form action={generateContextAction}>
                      <input name="cardId" type="hidden" value={card.id} />
                      <button
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition hover:bg-accent hover:text-[#2C3539]"
                        disabled={
                          card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
                        }
                        title="Generate and save one more example sentence, reading, and translation for this card."
                        type="submit"
                      >
                        <Sparkles className="size-4" />
                        {card.aiExampleContexts.length >= MAX_EXAMPLE_CONTEXTS
                          ? "Max Contexts"
                          : card.aiExampleContexts.length > 0
                            ? "Generate Another"
                            : "Generate Context"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">
                    The Overstory
                  </p>
                  <h2 className="font-serif text-2xl font-bold">
                    The Overstory Sandbox
                  </h2>
                </div>
                <BookOpen className="size-5 text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Watch your vocabulary blossom into custom reading context.
              </p>
              <button
                className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  storySeedCards.length < 3 ||
                  storySeedCards.length > 7 ||
                  isPending
                }
                onClick={generateSandbox}
                type="button"
              >
                <Sparkles className="size-4" />
                Generate Overstory
              </button>
              <p className="mt-4 min-h-44 rounded-lg border border-border bg-background p-4 text-sm leading-7">
                {story || "The Overstory will stream here."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">
                    The Understory
                  </p>
                  <h2 className="font-serif text-2xl font-bold">
                    The Understory Chat
                  </h2>
                </div>
                <span
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-primary"
                  title="Bramble"
                >
                  <TreePine className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop your conversational roots. Step into a low-pressure
                dialogue space with Bramble.
              </p>
              <div className="mt-4 flex min-h-44 flex-col gap-3 rounded-lg border border-border bg-background p-4">
                {chatMessages.map((message, index) => (
                  <div
                    className={cn(
                      "flex items-start gap-2",
                      message.role === "user" && "justify-end",
                    )}
                    key={`${message.role}-${index}`}
                  >
                    {message.role === "assistant" ? (
                      <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#D8E2DC] text-[#4A5D4E]">
                        <TreePine className="size-4" />
                      </span>
                    ) : null}
                    <p
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-[#F4E5D2] text-[#2C3539]",
                      )}
                    >
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      sendChatMessage();
                    }
                  }}
                  placeholder="Reply to Bramble"
                  value={chatInput}
                />
                <button
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending || chatSeedCards.length === 0}
                  onClick={sendChatMessage}
                  title="Send"
                  type="button"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
      {showSm2Help ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sm2-help-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="sm2-help-title"
                  className="font-serif text-2xl font-bold"
                >
                  SM-2 Review Scheduling
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Canopy uses the SuperMemo-2 pattern to decide when each card
                  comes back.
                </p>
              </div>
              <button
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                onClick={() => setShowSm2Help(false)}
                title="Close"
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6">
              <p>
                <strong>Interval</strong> is the number of days until the next
                review. A new card starts near zero, then grows after successful
                reviews.
              </p>
              <p>
                <strong>EF</strong> is the ease factor. Higher EF means future
                intervals grow faster. Hard reviews lower EF; easy reviews raise
                or preserve it.
              </p>
              <p>
                The review buttons are quality scores: <strong>2 Hard</strong>,{" "}
                <strong>3 Pass</strong>, <strong>4 Good</strong>, and{" "}
                <strong>5 Easy</strong>. The checkmark is the same as 5 Easy.
              </p>
              <p>
                The queue defaults to Due cards so it does not become one long
                collection view. Use All when you want to browse every card.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
