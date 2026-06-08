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
  CircleHelp,
  Droplets,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  addFlashcardAction,
  generateContextAction,
  importVocabularyAction,
  reviewCardAction,
} from "@/app/actions";
import logoDark from "@/app/assets/icons/canopy-logo-dark.svg";
import logoLight from "@/app/assets/icons/canopy-logo-light.svg";
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
  aiExampleContext: {
    sentence: string;
    phonetic: string;
    translation: string;
    generatedAt: string;
  } | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialImportState = {
  ok: true,
  message: "Paste a tab-separated log or upload a .txt file.",
};

const initialAddState = {
  ok: true,
  message: "Add one card directly.",
};

const sampleRows = "医院\tyi yuan\thospital\n会议\thui yi\tmeeting; conference";

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

export function CanopyWorkspace({ cards }: { cards: WorkspaceCard[] }) {
  const [importState, importAction, importPending] = useActionState(
    importVocabularyAction,
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Choose seeds, then start a short roleplay.",
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
  const recommendedIds = useMemo(
    () =>
      cards
        .filter(
          (card) =>
            card.easiness <= 240 || new Date(card.nextReviewAt) <= new Date(),
        )
        .slice(0, 7)
        .map((card) => card.id),
    [cards],
  );
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt) <= new Date(),
  ).length;

  function toggleSeed(
    cardId: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) {
    setter((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }

      if (current.length >= 7) {
        return current;
      }

      return [...current, cardId];
    });
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
          message.content !== "Choose seeds, then start a short roleplay.",
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

          <div className="grid grid-cols-3 gap-3 self-end">
            {[
              ["Cards", cards.length],
              ["Due", dueCount],
              ["Story", storySeedIds.length],
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
          <form
            action={importAction}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Log Drop</h2>
              <Upload className="size-5 text-primary" />
            </div>
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="languageCode"
            >
              Language
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
              id="languageCode"
              name="languageCode"
              defaultValue="zh-CN"
            >
              <option value="zh-CN">Mandarin</option>
              <option value="zh-HK">Cantonese</option>
              <option value="fr-FR">French</option>
              <option value="und">Agnostic</option>
            </select>
            <label className="mt-4 block text-sm font-medium" htmlFor="rawText">
              Raw text
            </label>
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-lg border border-dashed border-border bg-background p-3 text-sm leading-6 outline-none transition focus:border-primary"
              id="rawText"
              name="rawText"
              placeholder={sampleRows}
            />
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Sample rows
              </p>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {sampleRows}
              </pre>
            </div>
            <input
              className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
              name="file"
              type="file"
              accept=".txt,text/plain"
            />
            <button
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={importPending}
              type="submit"
            >
              <Upload className="size-4" />
              Import
            </button>
            <p
              className={cn(
                "mt-3 text-sm",
                importState.ok ? "text-muted-foreground" : "text-red-700",
              )}
            >
              {importState.message}
            </p>
          </form>

          <form
            action={addAction}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Add Card</h2>
              <Plus className="size-5 text-primary" />
            </div>
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="manualLanguageCode"
            >
              Language
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
              id="manualLanguageCode"
              name="manualLanguageCode"
              defaultValue="zh-CN"
            >
              <option value="zh-CN">Mandarin</option>
              <option value="zh-HK">Cantonese</option>
              <option value="fr-FR">French</option>
              <option value="und">Agnostic</option>
            </select>
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
              placeholder="ji chang"
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
            <button
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={addPending}
              type="submit"
            >
              <Plus className="size-4" />
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

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Story Seeds</h2>
              <button
                className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-accent hover:text-[#2C3539]"
                onClick={() => setStorySeedIds(recommendedIds)}
                title="Recommended Seeds"
                type="button"
              >
                Recommended
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Select 3 to 7 active rows for sandbox generation.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {cards.length === 0 ? (
                <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                  No vocabulary rows found. Import a log or run the seed script.
                </p>
              ) : null}
              {cards.slice(0, 12).map((card) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                  key={card.id}
                >
                  <input
                    checked={storySeedIds.includes(card.id)}
                    onChange={() => toggleSeed(card.id, setStorySeedIds)}
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
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">Chat Seeds</h2>
              <button
                className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-accent hover:text-[#2C3539]"
                onClick={() => setChatSeedIds(recommendedIds)}
                title="Recommended Seeds"
                type="button"
              >
                Recommended
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Select 1 to 7 rows for conversation practice.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {cards.length === 0 ? (
                <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                  No vocabulary rows found. Import a log or run the seed script.
                </p>
              ) : null}
              {cards.slice(0, 12).map((card) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                  key={card.id}
                >
                  <input
                    checked={chatSeedIds.includes(card.id)}
                    onChange={() => toggleSeed(card.id, setChatSeedIds)}
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
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-bold">
                  Sprouting Queue
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  SM-2 spaces reviews over time. Interval is days until the next
                  review; EF is the ease factor.
                </p>
              </div>
              <Droplets className="size-5 text-primary" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground lg:col-span-2">
                  No cards are available yet. Import vocabulary or run{" "}
                  <code>npm run db:seed</code> after pushing the schema.
                </div>
              ) : null}
              {cards.map((card) => (
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
                  {card.aiExampleContext ? (
                    <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm">
                      <p className="font-semibold">
                        {card.aiExampleContext.sentence}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {card.aiExampleContext.phonetic}
                      </p>
                      <p className="mt-1">
                        {card.aiExampleContext.translation}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[2, 3, 4, 5].map((quality) => (
                      <form action={reviewCardAction} key={quality}>
                        <input name="cardId" type="hidden" value={card.id} />
                        <input name="quality" type="hidden" value={quality} />
                        <button
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border transition hover:bg-accent hover:text-[#2C3539]"
                          title={`Review quality ${quality}`}
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
                        title="Generate and save an example sentence, reading, and translation for this card."
                        type="submit"
                      >
                        <Sparkles className="size-4" />
                        Generate Context
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
                <h2 className="font-serif text-2xl font-bold">Overstory</h2>
                <BookOpen className="size-5 text-primary" />
              </div>
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
                Generate Story
              </button>
              <p className="mt-4 min-h-44 rounded-lg border border-border bg-background p-4 text-sm leading-7">
                {story || "A streamed short story will appear here."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-serif text-2xl font-bold">Helper Studio</h2>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
                    title="The assistant should respond in the target language of your selected chat seeds."
                  >
                    <CircleHelp className="size-4" />
                  </span>
                  <MessageCircle className="size-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex min-h-44 flex-col gap-3 rounded-lg border border-border bg-background p-4">
                {chatMessages.map((message, index) => (
                  <p
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm leading-6",
                      message.role === "user"
                        ? "ml-8 bg-primary text-primary-foreground"
                        : "mr-8 bg-accent text-[#2C3539]",
                    )}
                    key={`${message.role}-${index}`}
                  >
                    {message.content}
                  </p>
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
                  placeholder="Reply using a seed word"
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
    </main>
  );
}
