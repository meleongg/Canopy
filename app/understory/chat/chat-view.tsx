"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History, Send, Sprout, TreePine } from "lucide-react";
import { fetchCards, streamTextResponse } from "@/components/canopy/card-utils";
import { ContextualChineseText } from "@/components/canopy/contextual-chinese-text";
import {
  DictionaryHelpControls,
} from "@/components/canopy/dictionary-help-controls";
import { useDictionaryHelp } from "@/components/canopy/use-dictionary-help";
import { SpeechButton } from "@/components/canopy/speech-button";
import type { ChatMessage, WorkspaceCard } from "@/components/canopy/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { queryKeys } from "@/lib/query-keys";
import {
  UNDERSTORY_LEARNER_TURN_LIMIT,
  understoryPersonas,
} from "@/lib/understory";
import { cn } from "@/lib/utils";
import { stripModelMarkdownMarkers } from "@/lib/ai-text";

type UnderstorySetup = {
  seedIds: string[];
  persona: "bramble" | "mossy";
  setting: string;
};

const fallbackSetup: UnderstorySetup = {
  seedIds: [],
  persona: "bramble",
  setting: "a quiet airport cafe",
};

let cachedStoredSetup = fallbackSetup;
let cachedStoredValue: string | null = null;

function subscribeToSetup() {
  return () => undefined;
}

function getStoredSetup() {
  const stored = window.sessionStorage.getItem("canopy-understory-setup");
  if (!stored) return fallbackSetup;
  if (stored === cachedStoredValue) return cachedStoredSetup;

  try {
    const parsed = JSON.parse(stored) as UnderstorySetup;
    cachedStoredValue = stored;
    cachedStoredSetup = parsed;
    return parsed;
  } catch {
    window.sessionStorage.removeItem("canopy-understory-setup");
    return fallbackSetup;
  }
}

export function UnderstoryChatView({
  initialCards,
}: {
  initialCards: WorkspaceCard[];
}) {
  const { data: cards = initialCards } = useQuery({
    queryKey: queryKeys.understorySeeds,
    queryFn: fetchCards,
    initialData: initialCards,
  });
  const setup = useSyncExternalStore(
    subscribeToSetup,
    getStoredSetup,
    () => fallbackSetup,
  );
  const [chatInput, setChatInput] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState("");
  const [dictionaryHelp, setDictionaryHelp] = useState(false);
  const openedRound = useRef<string | null>(null);
  const seedCards = useMemo(
    () => cards.filter((card) => setup.seedIds.includes(card.id)),
    [cards, setup.seedIds],
  );
  const learnerTurnCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  const roundKey = `${setup.persona}:${setup.setting}:${setup.seedIds.join(",")}`;
  const completedDictionaryTexts = useMemo(
    () =>
      dictionaryHelp
        ? messages.flatMap((message, index) =>
            message.role === "user" ||
            !(index === messages.length - 1 && (isOpening || isSending))
              ? [message.content]
              : [],
          )
        : [],
    [dictionaryHelp, isOpening, isSending, messages],
  );
  const entriesByText = useDictionaryHelp({
    enabled: dictionaryHelp,
    scopeKey: roundKey,
    texts: completedDictionaryTexts,
  });
  const companion = understoryPersonas[setup.persona];
  const CompanionIcon = setup.persona === "mossy" ? Sprout : TreePine;

  useEffect(() => {
    if (seedCards.length === 0 || openedRound.current === roundKey) return;
    openedRound.current = roundKey;
    setChatError("");
    setMessages([]);
    setIsOpening(true);

    async function openRound() {
      try {
        const response = await fetch("/api/generate-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardIds: seedCards.map((card) => card.id),
            scenario: setup.setting,
            persona: setup.persona,
            messageHistory: [],
          }),
        });

        if (!response.ok) {
          setChatError(await response.text());
          setMessages([]);
          return;
        }

        await streamTextResponse(response, (token) => {
          setMessages((current) => {
            if (current.length === 0) {
              return [{ role: "assistant", content: token }];
            }
            const copy = [...current];
            const last = copy[copy.length - 1];
            if (!last) return current;
            copy[copy.length - 1] = {
              role: "assistant",
              content: stripModelMarkdownMarkers(`${last.content}${token}`),
            };
            return copy;
          });
        });
      } catch {
        setChatError(
          "Your companion could not start the conversation. Please try a new practice round.",
        );
        setMessages([]);
      } finally {
        setIsOpening(false);
      }
    }

    void openRound();
  }, [roundKey, seedCards, setup.persona, setup.setting]);

  function sendChatMessage() {
    const content = chatInput.trim();
    if (
      !content ||
      seedCards.length === 0 ||
      isOpening ||
      isSending ||
      learnerTurnCount >= UNDERSTORY_LEARNER_TURN_LIMIT
    ) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setChatInput("");
    setChatError("");
    setMessages(nextMessages);
    setIsSending(true);

    async function sendReply() {
      try {
        const response = await fetch("/api/generate-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardIds: seedCards.map((card) => card.id),
            scenario: setup.setting,
            persona: setup.persona,
            messageHistory: nextMessages,
          }),
        });

        if (!response.ok) {
          setChatError(await response.text());
          return;
        }

        await streamTextResponse(response, (token) => {
          setMessages((current) => {
            if (current.length === nextMessages.length) {
              return [...current, { role: "assistant", content: token }];
            }
            const copy = [...current];
            const last = copy[copy.length - 1];
            if (!last) return current;
            copy[copy.length - 1] = {
              role: "assistant",
              content: stripModelMarkdownMarkers(`${last.content}${token}`),
            };
            return copy;
          });
        });
      } catch {
        setChatError("Your reply could not be sent. Please try again.");
      } finally {
        setIsSending(false);
      }
    }

    void sendReply();
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-8">
      <Card className="min-h-[calc(100vh-14rem)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">
                The Understory
              </p>
              <CardTitle>The Understory Chat</CardTitle>
              <CardDescription>
                A focused {UNDERSTORY_LEARNER_TURN_LIMIT}-turn conversation with {companion.name}.
              </CardDescription>
            </div>
            <Avatar className="border border-primary bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <CompanionIcon className="size-5 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>
        <CardContent>
          {seedCards.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              No Understory seeds are selected.{" "}
              <Link
                className="font-semibold text-primary"
                href="/understory/setup"
              >
                Choose seeds
              </Link>{" "}
              before chatting with a companion.
            </div>
          ) : null}
          {seedCards.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-primary">
                Today&apos;s practice
              </p>
              <p className="mt-1 font-serif text-xl font-bold capitalize">
                {setup.setting}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {seedCards.map((card) => (
                  <Badge key={card.id}>{card.targetText}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <DictionaryHelpControls
              enabled={dictionaryHelp}
              setEnabled={setDictionaryHelp}
              showDescription
              variant="compact"
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Listen plays an AI-generated companion voice. Audio is created only
            when you choose to play a completed reply.
          </p>
          <div className="mt-4 flex min-h-96 flex-col gap-3 rounded-xl border border-border bg-background p-4">
            {isOpening && messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your companion is preparing the first question…
              </p>
            ) : null}
            {messages.map((message, index) => (
              <div
                className={cn(
                  "flex items-start gap-2",
                  message.role === "user" && "justify-end",
                )}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" ? (
                  <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CompanionIcon className="size-4 text-primary-foreground" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground",
                  )}
                >
                  {message.role === "assistant" || dictionaryHelp ? (
                    <ContextualChineseText
                      entries={entriesByText.get(message.content) ?? []}
                      lookupEnabled={dictionaryHelp}
                      seedCards={seedCards}
                      text={message.content}
                    />
                  ) : message.content}
                  {message.role === "assistant" ? (
                    <SpeechButton
                      disabled={
                        index === messages.length - 1 && (isOpening || isSending)
                      }
                      speaker={setup.persona}
                      text={message.content}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {chatError ? (
            <p
              className="mt-3 rounded-lg border border-primary/40 bg-card p-3 text-sm text-muted-foreground"
              role="status"
            >
              {chatError}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">
              Your reply: turn {Math.min(learnerTurnCount + 1, UNDERSTORY_LEARNER_TURN_LIMIT)} of {UNDERSTORY_LEARNER_TURN_LIMIT}
            </span>
            <span className="text-muted-foreground">
              A short, focused conversation around your selected vocabulary.
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              className="h-11 min-w-0 flex-1"
              disabled={
                isOpening ||
                isSending ||
                seedCards.length === 0 ||
                learnerTurnCount >= UNDERSTORY_LEARNER_TURN_LIMIT
              }
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendChatMessage();
                }
              }}
              placeholder={`Reply to ${companion.name}`}
              value={chatInput}
            />
            <Button
              className="size-11"
              disabled={
                isOpening ||
                isSending ||
                seedCards.length === 0 ||
                learnerTurnCount >= UNDERSTORY_LEARNER_TURN_LIMIT
              }
              onClick={sendChatMessage}
              title="Send"
              type="button"
            >
              <Send />
            </Button>
          </div>
          {learnerTurnCount >= UNDERSTORY_LEARNER_TURN_LIMIT ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                This {UNDERSTORY_LEARNER_TURN_LIMIT}-turn practice is complete and saved to your private
                history.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/history">
                    <History />
                    View history
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/understory/setup">
                    New practice
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
