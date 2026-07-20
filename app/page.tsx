import Link from "next/link";
import { BookOpen, MessageCircle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/lib/session";

const previews = [
  {
    title: "The Sprouting Queue",
    description:
      "Review cards on SM-2 intervals so words return when they need attention.",
    icon: Sprout,
  },
  {
    title: "The Overstory Sandbox",
    description: "Watch your vocabulary blossom into custom reading context.",
    icon: BookOpen,
  },
  {
    title: "The Understory Chat",
    description:
      "Drop your conversational roots in a low-pressure dialogue with Bramble.",
    icon: MessageCircle,
  },
];

export default async function LandingPage() {
  const session = await getServerSession();
  const href = session ? "/dashboard" : "/register";

  return (
    <main>
      <section className="border-b border-border bg-card/60">
        <div className="mx-auto grid min-h-[calc(100vh-11rem)] w-full max-w-7xl content-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase text-primary">
              Canopy
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl font-black leading-tight md:text-7xl">
              Vocabulary grows by use.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Import dictionary logs, review what is due, and turn selected
              words into reading and conversation practice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={href}>
                  {session ? "Open Dashboard" : "Start Growing"}
                </Link>
              </Button>
              {!session ? (
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid content-center gap-4">
            {previews.map((preview) => {
              const Icon = preview.icon;

              return (
                <Card key={preview.title}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                        <Icon className="size-5" />
                      </span>
                      <CardTitle>{preview.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{preview.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
