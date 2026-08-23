"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CloudRain,
  Library,
  MapPin,
  MessageCircle,
  PencilLine,
  ShoppingBasket,
  Sprout,
  TreePine,
} from "lucide-react";
import { fetchCards } from "@/components/canopy/card-utils";
import { SeedPicker } from "@/components/canopy/seed-picker";
import type { WorkspaceCard } from "@/components/canopy/types";
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
import { understoryPersonas, type UnderstoryPersona } from "@/lib/understory";
import { cn } from "@/lib/utils";

const settings = [
  {
    value: "a neighborhood market",
    title: "Neighborhood market",
    description: "Ask for groceries and make a small purchase.",
    icon: ShoppingBasket,
  },
  {
    value: "a library study table",
    title: "Library study table",
    description: "Compare notes and make a plan together.",
    icon: Library,
  },
  {
    value: "a rainy bus stop",
    title: "Rainy bus stop",
    description: "Pass the time while waiting for a ride.",
    icon: CloudRain,
  },
  {
    value: "a quiet airport cafe",
    title: "Airport cafe",
    description: "Order a drink before a journey.",
    icon: MapPin,
  },
] as const;

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
  const [persona, setPersona] = useState<UnderstoryPersona>("bramble");
  const [selectedSetting, setSelectedSetting] = useState<string>(
    settings[0].value,
  );
  const [customSetting, setCustomSetting] = useState("");
  const seedCards = useMemo(
    () => cards.filter((card) => seedIds.includes(card.id)),
    [cards, seedIds],
  );
  const setting =
    selectedSetting === "custom" ? customSetting.trim() : selectedSetting;
  const companion = understoryPersonas[persona];

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
          title="Vocabulary for this round"
          description="Choose 1 to 7 cards your companion can naturally bring into the conversation."
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
                <CardTitle>Build a conversation</CardTitle>
                <CardDescription>
                  Set up all three parts of a focused, five-turn practice round.
                </CardDescription>
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <TreePine className="size-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <section aria-labelledby="companion-heading">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  1. Companion
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold" id="companion-heading">
                  Who should meet you there?
                </h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(Object.entries(understoryPersonas) as [
                  UnderstoryPersona,
                  (typeof understoryPersonas)[UnderstoryPersona],
                ][]).map(([item, details]) => {
                  const Icon = item === "bramble" ? TreePine : Sprout;
                  const selected = persona === item;
                  return (
                    <Button
                      aria-pressed={selected}
                      className={cn(
                        "h-auto items-start justify-start whitespace-normal p-4 text-left",
                        selected && "border-primary bg-primary text-primary-foreground",
                      )}
                      key={item}
                      onClick={() => setPersona(item)}
                      type="button"
                      variant="outline"
                    >
                      <Icon className="mt-0.5 size-5" />
                      <span>
                        <span className="block font-serif text-lg font-bold">
                          {details.name}
                        </span>
                        <span className="mt-1 block text-sm font-normal leading-5 opacity-80">
                          {details.description}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="setting-heading">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  2. Setting
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold" id="setting-heading">
                  Where does the conversation happen?
                </h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {settings.map((item) => {
                  const Icon = item.icon;
                  const selected = selectedSetting === item.value;
                  return (
                    <Button
                      aria-pressed={selected}
                      className={cn(
                        "h-auto items-start justify-start whitespace-normal p-4 text-left",
                        selected && "border-primary bg-primary text-primary-foreground",
                      )}
                      key={item.value}
                      onClick={() => setSelectedSetting(item.value)}
                      type="button"
                      variant="outline"
                    >
                      <Icon className="mt-0.5 size-5" />
                      <span>
                        <span className="block font-semibold">{item.title}</span>
                        <span className="mt-1 block text-sm font-normal leading-5 opacity-80">
                          {item.description}
                        </span>
                      </span>
                    </Button>
                  );
                })}
                <Button
                  aria-pressed={selectedSetting === "custom"}
                  className={cn(
                    "h-auto items-start justify-start whitespace-normal p-4 text-left sm:col-span-2",
                    selectedSetting === "custom" &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                  onClick={() => setSelectedSetting("custom")}
                  type="button"
                  variant="outline"
                >
                  <PencilLine className="mt-0.5 size-5" />
                  <span>
                    <span className="block font-semibold">Make your own scene</span>
                    <span className="mt-1 block text-sm font-normal leading-5 opacity-80">
                      Practise a conversation that fits something you actually want to say.
                    </span>
                  </span>
                </Button>
              </div>
              {selectedSetting === "custom" ? (
                <div className="mt-3">
                  <label className="text-sm font-semibold" htmlFor="custom-setting">
                    Describe the setting
                  </label>
                  <Input
                    className="mt-2"
                    id="custom-setting"
                    maxLength={500}
                    onChange={(event) => setCustomSetting(event.target.value)}
                    placeholder="For example: ordering snacks at a night market"
                    value={customSetting}
                  />
                </div>
              ) : null}
            </section>

            <section
              aria-labelledby="session-summary-heading"
              className="rounded-xl border border-border bg-background p-4"
            >
              <p className="text-xs font-semibold uppercase text-primary">
                3. Your round
              </p>
              <h2
                className="mt-1 font-serif text-xl font-semibold"
                id="session-summary-heading"
              >
                Review your round
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {seedCards.length} selected seed{seedCards.length === 1 ? "" : "s"} · {companion.name} · {setting || "add a setting to continue"}
              </p>
            </section>

            <Button
              disabled={
                seedCards.length < 1 || seedCards.length > 7 || !setting
              }
              onClick={continueToChat}
              type="button"
            >
              <MessageCircle />
              Start five-turn chat
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
