import Link from "next/link";
import {
  BookOpen,
  Compass,
  History,
  MessageCircle,
  Sprout,
} from "lucide-react";
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
    title: "Import & review",
    description:
      "Preview a vocabulary export, keep only the cards you want, then revisit them when they are due.",
    icon: Sprout,
  },
  {
    title: "Practice in context",
    description: "Watch your vocabulary blossom into custom reading context.",
    icon: BookOpen,
  },
  {
    title: "Read, speak, explore",
    description:
      "Use Overstory, Understory voice or text chat, and low-stakes Chinese contrasts without disturbing review.",
    icon: MessageCircle,
  },
  {
    title: "Keep your trail",
    description:
      "Return to private completed practice and dictionary lookups whenever you need a refresher.",
    icon: History,
  },
];

export default async function LandingPage() {
  const session = await getServerSession();
  const href = session ? "/dashboard" : "/register";

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 border-b border-border bg-card/60">
        <div className="mx-auto grid w-full max-w-7xl content-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase text-primary">
              A private Chinese learning workspace
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl font-black leading-tight md:text-7xl">
              Bring your words into practice.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Preview a Mandarin vocabulary list, choose Simplified or
              Traditional display, review on a gentle rhythm, then use your own
              words in reading, conversation, voice, and exploratory practice.
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
              {session ? (
                <Button asChild size="lg" variant="ghost">
                  <Link href="/explore">
                    <Compass /> Explore Chinese
                  </Link>
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
