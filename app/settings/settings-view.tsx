"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useCanopyTheme } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import type { UserPreferences } from "@/lib/user-preferences";
import { queryKeys } from "@/lib/query-keys";

const readingSizeOptions: {
  label: string;
  value: UserPreferences["readingSize"];
}[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "extra-large", label: "Extra large" },
];

const practicePreferenceOptions = {
  proficiency: [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ],
  correctionStyle: [
    { value: "gentle", label: "Gentle" },
    { value: "direct", label: "Direct" },
    { value: "on-request", label: "On request" },
  ],
  conversationGoal: [
    { value: "everyday", label: "Everyday" },
    { value: "travel", label: "Travel" },
    { value: "work", label: "Work" },
    { value: "vocabulary", label: "Vocabulary" },
  ],
  chineseScript: [
    { value: "simplified", label: "Simplified" },
    { value: "traditional", label: "Traditional" },
  ],
  formality: [
    { value: "casual", label: "Casual" },
    { value: "neutral", label: "Neutral" },
    { value: "formal", label: "Formal" },
  ],
  playbackSpeed: [
    { value: "0.75", label: "0.75×" },
    { value: "1", label: "1×" },
    { value: "1.25", label: "1.25×" },
    { value: "1.5", label: "1.5×" },
  ],
} as const satisfies Record<
  string,
  readonly { value: string; label: string }[]
>;

export function SettingsView({
  initialName,
  preferences: initialPreferences,
}: {
  initialName: string;
  preferences: UserPreferences;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setChineseScript, setReadingSize, setTheme } = useCanopyTheme();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordFormKey, setPasswordFormKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        await action();
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
      }
    });
  }

  function saveProfile(formData: FormData) {
    run(async () => {
      const result = await authClient.updateUser({
        name: String(formData.get("name") ?? "").trim(),
      });
      if (result.error) throw new Error(result.error.message);
      toast("Profile saved.");
      router.refresh();
    });
  }

  function savePassword(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    run(async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      setPasswordFormKey((current) => current + 1);
      toast("Password updated. Other sessions were signed out.");
    });
  }

  function savePreferences(nextPreferences: UserPreferences) {
    run(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreferences),
      });
      if (!response.ok) throw new Error();
      setPreferences(nextPreferences);
      queryClient.setQueryData(queryKeys.userPreferences, nextPreferences);
      setTheme(nextPreferences.theme);
      setReadingSize(nextPreferences.readingSize);
      setChineseScript(nextPreferences.chineseScript);
      toast("Learning preferences saved.");
    });
  }

  function deleteAccount(formData: FormData) {
    const password = String(formData.get("deletePassword") ?? "");
    if (deleteConfirmation !== "DELETE") return;
    run(async () => {
      const result = await authClient.deleteUser({ password });
      if (result.error) throw new Error(result.error.message);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <header className="mt-8">
        <p className="text-xs font-semibold uppercase text-primary">Account</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage your profile, learning defaults, and account security.
        </p>
      </header>
      {errorMessage ? (
        <p className="mt-4 text-sm text-primary" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-6 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your display name appears in Canopy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={saveProfile}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
              <Button disabled={isPending} type="submit">
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Learning defaults</CardTitle>
            <CardDescription>
              Defaults for practice. You can still adjust controls during a
              session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Learning language</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mandarin (private beta)
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Theme</p>
              <div className="mt-2 flex gap-2">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    savePreferences({ ...preferences, theme: "light" })
                  }
                  type="button"
                  variant={
                    preferences.theme === "light" ? "default" : "outline"
                  }
                >
                  Light
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    savePreferences({ ...preferences, theme: "dark" })
                  }
                  type="button"
                  variant={preferences.theme === "dark" ? "default" : "outline"}
                >
                  Dark
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Reading text size</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Applies to Understory, Overstory, and saved practice text while
                keeping navigation and setup controls compact.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {readingSizeOptions.map(({ label, value }) => (
                  <Button
                    aria-pressed={preferences.readingSize === value}
                    disabled={isPending}
                    key={value}
                    onClick={() =>
                      savePreferences({
                        ...preferences,
                        readingSize: value,
                      })
                    }
                    type="button"
                    variant={
                      preferences.readingSize === value ? "default" : "outline"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Practice proficiency</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Shapes the complexity and support in generated practice.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.proficiency.map(({ label, value }) => (
                  <Button
                    aria-pressed={preferences.proficiency === value}
                    disabled={isPending}
                    key={value}
                    onClick={() =>
                      savePreferences({
                        ...preferences,
                        proficiency: value,
                      })
                    }
                    type="button"
                    variant={
                      preferences.proficiency === value ? "default" : "outline"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Corrections</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Guides how your companion responds to mistakes in Understory.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.correctionStyle.map(
                  ({ label, value }) => (
                    <Button
                      aria-pressed={preferences.correctionStyle === value}
                      disabled={isPending}
                      key={value}
                      onClick={() =>
                        savePreferences({
                          ...preferences,
                          correctionStyle: value,
                        })
                      }
                      type="button"
                      variant={
                        preferences.correctionStyle === value
                          ? "default"
                          : "outline"
                      }
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Conversation goal</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.conversationGoal.map(
                  ({ label, value }) => (
                    <Button
                      aria-pressed={preferences.conversationGoal === value}
                      disabled={isPending}
                      key={value}
                      onClick={() =>
                        savePreferences({
                          ...preferences,
                          conversationGoal: value,
                        })
                      }
                      type="button"
                      variant={
                        preferences.conversationGoal === value
                          ? "default"
                          : "outline"
                      }
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Chinese script</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Defaults to Simplified. Used for Chinese card display and
                generated practice.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.chineseScript.map(
                  ({ label, value }) => (
                    <Button
                      aria-pressed={preferences.chineseScript === value}
                      disabled={isPending}
                      key={value}
                      onClick={() =>
                        savePreferences({
                          ...preferences,
                          chineseScript: value,
                        })
                      }
                      type="button"
                      variant={
                        preferences.chineseScript === value
                          ? "default"
                          : "outline"
                      }
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Conversation formality</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.formality.map(({ label, value }) => (
                  <Button
                    aria-pressed={preferences.formality === value}
                    disabled={isPending}
                    key={value}
                    onClick={() =>
                      savePreferences({ ...preferences, formality: value })
                    }
                    type="button"
                    variant={
                      preferences.formality === value ? "default" : "outline"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Default voice speed</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You can still change speed beside any completed reply.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {practicePreferenceOptions.playbackSpeed.map(
                  ({ label, value }) => (
                    <Button
                      aria-pressed={preferences.playbackSpeed === value}
                      disabled={isPending}
                      key={value}
                      onClick={() =>
                        savePreferences({
                          ...preferences,
                          playbackSpeed: value,
                        })
                      }
                      type="button"
                      variant={
                        preferences.playbackSpeed === value
                          ? "default"
                          : "outline"
                      }
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Changing it signs out your other active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={savePassword}
              className="space-y-3"
              key={passwordFormKey}
            >
              <Input
                autoComplete="current-password"
                name="currentPassword"
                placeholder="Current password"
                required
                type="password"
              />
              <Input
                autoComplete="new-password"
                minLength={8}
                name="newPassword"
                placeholder="New password"
                required
                type="password"
              />
              <Button disabled={isPending} type="submit">
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              This permanently deletes your cards and saved practice. This
              cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setDeleteOpen(true)}
              type="button"
              variant="destructive"
            >
              <Trash2 /> Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmation("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your Canopy account?</DialogTitle>
            <DialogDescription>
              Enter your password to permanently delete your account, cards, and
              saved practice.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAccount} className="space-y-4">
            <Input
              autoComplete="current-password"
              name="deletePassword"
              placeholder="Current password"
              required
              type="password"
            />
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="deleteConfirmation"
              >
                Type DELETE to confirm
              </label>
              <Input
                className="mt-2"
                id="deleteConfirmation"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
                value={deleteConfirmation}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setDeleteOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending || deleteConfirmation !== "DELETE"}
                type="submit"
                variant="destructive"
              >
                Delete permanently
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
