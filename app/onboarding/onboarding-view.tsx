"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { LanguageSelect } from "@/components/canopy/language-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserPreferences } from "@/lib/user-preferences";
import { queryKeys } from "@/lib/query-keys";

const options = {
  proficiency: [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]],
  correctionStyle: [["gentle", "Gentle"], ["direct", "Direct"], ["on-request", "On request"]],
  chineseScript: [["match-cards", "Original card forms"], ["simplified", "Simplified"], ["traditional", "Traditional"]],
  playbackSpeed: [["0.75", "0.75×"], ["1", "1×"], ["1.25", "1.25×"], ["1.5", "1.5×"]],
} as const;

export function OnboardingView({ initialPreferences }: { initialPreferences: UserPreferences }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  function finish() {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
      if (!response.ok) { setError("We could not save your defaults. Please try again."); return; }
      queryClient.setQueryData(
        queryKeys.userPreferences,
        (await response.json()) as UserPreferences,
      );
      router.push("/dashboard");
      router.refresh();
    });
  }
  return <main className="mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-2xl items-center px-4 py-10"><Card className="w-full"><CardHeader><Sparkles className="size-6 text-primary" /><CardTitle>Set your learning defaults</CardTitle><CardDescription>A few choices to make your first practice feel like yours. You can change everything in Settings later.</CardDescription></CardHeader><CardContent className="space-y-6"><div><label className="text-sm font-medium">I&apos;m learning</label><LanguageSelect value={preferences.importLanguage} onValueChange={(importLanguage) => setPreferences({ ...preferences, importLanguage: importLanguage as UserPreferences["importLanguage"] })} /></div><Choice label="Practice level" name="proficiency" preferences={preferences} options={options.proficiency} setPreferences={setPreferences} /><Choice label="Corrections" name="correctionStyle" preferences={preferences} options={options.correctionStyle} setPreferences={setPreferences} /><Choice label="Chinese script" name="chineseScript" preferences={preferences} options={options.chineseScript} setPreferences={setPreferences} /><Choice label="Voice speed" name="playbackSpeed" preferences={preferences} options={options.playbackSpeed} setPreferences={setPreferences} />{error ? <p className="text-sm text-primary" role="alert">{error}</p> : null}<div className="flex flex-wrap justify-end gap-2"><Button disabled={isPending} onClick={finish} type="button" variant="ghost">Skip for now</Button><Button disabled={isPending} onClick={finish} type="button">{isPending ? "Saving defaults…" : "Continue to Canopy"}</Button></div><p className="text-center text-xs text-muted-foreground">You can change these defaults any time in Settings.</p></CardContent></Card></main>;
}

function Choice({ label, name, options: choiceOptions, preferences, setPreferences }: { label: string; name: "proficiency" | "correctionStyle" | "chineseScript" | "playbackSpeed"; options: readonly (readonly [string, string])[]; preferences: UserPreferences; setPreferences: (preferences: UserPreferences) => void }) {
  return <div><p className="text-sm font-medium">{label}</p><div className="mt-2 flex flex-wrap gap-2">{choiceOptions.map(([value, text]) => <Button aria-pressed={preferences[name] === value} key={value} onClick={() => setPreferences({ ...preferences, [name]: value } as UserPreferences)} type="button" variant={preferences[name] === value ? "default" : "outline"}>{text}</Button>)}</div></div>;
}
