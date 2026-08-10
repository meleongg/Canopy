"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await authClient.signUp.email({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        name: String(formData.get("name") ?? "Canopy User"),
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to create account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <Input autoComplete="name" id="name" name="name" required />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          type="email"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          autoComplete="new-password"
          name="password"
          minLength={8}
          type="password"
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-primary" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
