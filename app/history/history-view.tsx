"use client";

import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, Trash2 } from "lucide-react";
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

export function HistoryView() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [message, setMessage] = useState("Loading your completed practice…");
  const [deletingSession, setDeletingSession] = useState<SavedSession | null>(
    null,
  );

  useEffect(() => {
    void fetch("/api/sessions")
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ sessions: SavedSession[] }>;
      })
      .then((payload) => {
        setSessions(payload.sessions);
        setMessage(
          payload.sessions.length
            ? ""
            : "No completed practice yet. Your next story or three-turn chat will appear here.",
        );
      })
      .catch(() => setMessage("Practice history could not be loaded."));
  }, []);

  async function removeSession() {
    if (!deletingSession) return;
    const sessionId = deletingSession.id;
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setSessions((current) =>
        current.filter((session) => session.id !== sessionId),
      );
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
          {message ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              {message}
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
