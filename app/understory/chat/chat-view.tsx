"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Send, TreePine } from "lucide-react";
import { fetchCards, streamTextResponse } from "@/components/canopy/card-utils";
import type { ChatMessage, WorkspaceCard } from "@/components/canopy/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";

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
  const [setup] = useState<UnderstorySetup>(() => {
    if (typeof window === "undefined") {
      return fallbackSetup;
    }

    const stored = window.sessionStorage.getItem("canopy-understory-setup");
    if (!stored) {
      return fallbackSetup;
    }

    try {
      return JSON.parse(stored) as UnderstorySetup;
    } catch {
      return fallbackSetup;
    }
  });
  const [chatInput, setChatInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bramble is ready. Choose seeds, then step into a low-pressure dialogue.",
    },
  ]);
  const seedCards = useMemo(
    () => cards.filter((card) => setup.seedIds.includes(card.id)),
    [cards, setup.seedIds],
  );
  const learnerTurnCount = messages.filter(
    (message) => message.role === "user",
  ).length;

  function sendChatMessage() {
    const content = chatInput.trim();
    if (!content || seedCards.length === 0 || learnerTurnCount >= 3) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages.filter(
        (message) =>
          message.content !==
          "Bramble is ready. Choose seeds, then step into a low-pressure dialogue.",
      ),
      { role: "user", content },
    ];
    setChatInput("");
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    startTransition(async () => {
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
        const error = await response.text();
        setMessages([...nextMessages, { role: "assistant", content: error }]);
        return;
      }

      await streamTextResponse(response, (token) => {
        setMessages((current) => {
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
                Drop your conversational roots. Step into a low-pressure
                dialogue space with Bramble.
              </CardDescription>
            </div>
            <Avatar>
              <AvatarFallback>
                <TreePine className="size-5" />
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
              before chatting with Bramble.
            </div>
          ) : null}
          <div className="mt-4 flex min-h-96 flex-col gap-3 rounded-xl border border-border bg-background p-4">
            {messages.map((message, index) => (
              <div
                className={cn(
                  "flex items-start gap-2",
                  message.role === "user" && "justify-end",
                )}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" ? (
                  <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-foreground">
                    <TreePine className="size-4" />
                  </span>
                ) : null}
                <p
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground",
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              className="h-11 min-w-0 flex-1"
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendChatMessage();
                }
              }}
              placeholder="Reply to Bramble"
              value={chatInput}
            />
            <Button
              className="size-11"
              disabled={isPending || seedCards.length === 0 || learnerTurnCount >= 3}
              onClick={sendChatMessage}
              title="Send"
              type="button"
            >
              <Send />
            </Button>
          </div>
          {learnerTurnCount >= 3 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This three-turn practice has reached its natural stopping point.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
