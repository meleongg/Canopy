"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Leaf, MessageCircle, TreePine } from "lucide-react";
import { SeedPicker } from "@/components/canopy/seed-picker";
import { fetchCards } from "@/components/canopy/card-utils";
import type { WorkspaceCard } from "@/components/canopy/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/query-keys";

const personas = ["bramble", "mossy"] as const;

const settings = [
  "a quiet airport cafe",
  "a neighborhood market",
  "a library study table",
  "a rainy bus stop",
];

export function UnderstorySetupView({
  initialCards,
}: {
  initialCards: WorkspaceCard[];
}) {
  const router = useRouter();
  const { data: cards = initialCards } = useQuery({
    queryKey: queryKeys.understorySeeds,
    queryFn: fetchCards,
    initialData: initialCards,
  });
  const [seedIds, setSeedIds] = useState<string[]>(
    cards.slice(0, 3).map((card) => card.id),
  );
  const [persona, setPersona] = useState<(typeof personas)[number]>(personas[0]);
  const [setting, setSetting] = useState(settings[0]);
  const seedCards = useMemo(
    () => cards.filter((card) => seedIds.includes(card.id)),
    [cards, seedIds],
  );

  function continueToChat() {
    window.sessionStorage.setItem(
      "canopy-understory-setup",
      JSON.stringify({ seedIds, persona, setting }),
    );
    router.push("/understory/chat");
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[380px_1fr] md:px-8">
      <aside>
        <SeedPicker
          title="The Understory Seeds"
          description="Choose 1 to 7 cards that Bramble should weave into The Understory Chat."
          cards={cards}
          selectedIds={seedIds}
          setSelectedIds={setSeedIds}
          min={1}
        />
      </aside>
      <section>
        <Card>
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
              <span className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <TreePine className="size-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="seeds">
              <TabsList>
                <TabsTrigger value="seeds">
                  <Leaf className="mr-2 size-4" />
                  Seeds
                </TabsTrigger>
                <TabsTrigger value="persona">Persona</TabsTrigger>
                <TabsTrigger value="setting">Setting</TabsTrigger>
              </TabsList>
              <TabsContent value="seeds">
                <p className="text-sm leading-6 text-muted-foreground">
                  {seedCards.length} selected seed
                  {seedCards.length === 1 ? "" : "s"} will guide Bramble&apos;s
                  vocabulary choices.
                </p>
              </TabsContent>
              <TabsContent value="persona">
                <label className="text-sm font-medium">Bramble style</label>
                <Select
                  value={persona}
                  onValueChange={(value) => {
                    if (value === "bramble" || value === "mossy") {
                      setPersona(value);
                    }
                  }}
                >
                  <SelectTrigger className="mt-2 max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="setting">
                <label className="text-sm font-medium">Scene</label>
                <Select value={setting} onValueChange={setSetting}>
                  <SelectTrigger className="mt-2 max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
            <Button
              className="mt-6"
              disabled={seedCards.length < 1 || seedCards.length > 7}
              onClick={continueToChat}
              type="button"
            >
              <MessageCircle />
              Start The Understory Chat
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
