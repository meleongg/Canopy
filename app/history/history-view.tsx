"use client";

import { useMemo, useState } from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BookOpen, LoaderCircle, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";

type SavedSession = {
  id: string;
  sessionType: "story_sandbox" | "helper_chat";
  createdAt: string;
  seedSnapshot: { targetText: string }[];
  contentHistory: {
    storyParagraph?: string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };
};

type HistoryFilter = "all" | "story_sandbox" | "helper_chat";

const historyFilters: { label: string; value: HistoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Overstory", value: "story_sandbox" },
  { label: "Understory", value: "helper_chat" },
];

function emptyHistoryMessage(filter: HistoryFilter) {
  if (filter === "story_sandbox") return "No completed Overstory sessions yet.";
  if (filter === "helper_chat") return "No completed Understory sessions yet.";
  return "No completed practice yet. Your next story or conversation will appear here.";
}

type HistoryPage = { nextCursor: string | null; sessions: SavedSession[] };

async function fetchHistoryPage({
  cursor,
  filter,
}: {
  cursor: string | null;
  filter: HistoryFilter;
}) {
  const searchParams = new URLSearchParams({ filter });
  if (cursor) searchParams.set("cursor", cursor);
  const response = await fetch(`/api/sessions?${searchParams.toString()}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<HistoryPage>;
}

export function HistoryView() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const queryClient = useQueryClient();
  const [deletingSession, setDeletingSession] = useState<SavedSession | null>(
    null,
  );
  const historyQuery = useInfiniteQuery<
    HistoryPage,
    Error,
    InfiniteData<HistoryPage>,
    ReturnType<typeof queryKeys.practiceHistory>,
    string | null
  >({
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchHistoryPage({ cursor: pageParam, filter }),
    queryKey: queryKeys.practiceHistory(filter),
  });
  const sessions = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.sessions) ?? [],
    [historyQuery.data],
  );

  function selectFilter(nextFilter: HistoryFilter) {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
  }

  async function removeSession() {
    if (!deletingSession) return;
    const sessionId = deletingSession.id;
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      await queryClient.invalidateQueries({
        queryKey: ["practiceHistory"],
      });
      setDeletingSession(null);
      toast("Saved practice deleted.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Practice history</CardTitle>
          <CardDescription>
            Completed Overstory and Understory sessions are private to your
            Canopy account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            aria-label="Practice history filter"
            className="inline-flex rounded-lg border border-border bg-background p-1"
            role="group"
          >
            {historyFilters.map((option) => (
              <Button
                aria-pressed={filter === option.value}
                className="h-8"
                key={option.value}
                onClick={() => selectFilter(option.value)}
                size="sm"
                type="button"
                variant={filter === option.value ? "default" : "ghost"}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {historyQuery.isLoading ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Loading completed practice…
            </p>
          ) : null}
          {historyQuery.isError ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Practice history could not be loaded.
            </p>
          ) : null}
          {!historyQuery.isLoading && !historyQuery.isError && sessions.length === 0 ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              {emptyHistoryMessage(filter)}
            </p>
          ) : null}
          {sessions.map((session) => {
            const story = session.contentHistory.storyParagraph;
            const messages = session.contentHistory.messages ?? [];
            return (
              <article
                className="rounded-xl border border-border bg-background p-5"
                key={session.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                      {session.sessionType === "story_sandbox" ? (
                        <BookOpen className="size-4" />
                      ) : (
                        <MessageCircle className="size-4" />
                      )}
                      {session.sessionType === "story_sandbox"
                        ? "Overstory"
                        : "Understory"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(session.createdAt))}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDeletingSession(session)}
                    size="icon"
                    title="Delete saved practice"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Seeds:{" "}
                  {session.seedSnapshot
                    .map((seed) => seed.targetText)
                    .join(", ")}
                </p>
                {story ? <p className="mt-4 leading-7">{story}</p> : null}
                {messages.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {messages.map((entry, index) => (
                      <p
                        className="rounded-lg border border-border bg-card p-3 text-sm"
                        key={`${entry.role}-${index}`}
                      >
                        <strong>
                          {entry.role === "user" ? "You" : "Canopy"}:
                        </strong>{" "}
                        {entry.content}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
          {historyQuery.hasNextPage ? (
            <Button
              className="w-full"
              disabled={historyQuery.isFetchingNextPage}
              onClick={() => void historyQuery.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {historyQuery.isFetchingNextPage ? <LoaderCircle className="animate-spin" /> : null}
              {historyQuery.isFetchingNextPage ? "Loading more…" : "Load more practice"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Dialog
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
        open={Boolean(deletingSession)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete saved practice?</DialogTitle>
            <DialogDescription>
              This removes this completed{" "}
              {deletingSession?.sessionType === "story_sandbox"
                ? "Overstory"
                : "Understory"}{" "}
              session from your history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              onClick={() => setDeletingSession(null)}
              type="button"
              variant="outline"
            >
              Keep session
            </Button>
            <Button
              onClick={() => void removeSession()}
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
