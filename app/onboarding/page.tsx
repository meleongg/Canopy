import { redirect } from "next/navigation";
import { OnboardingView } from "@/app/onboarding/onboarding-view";
import { requireAuth } from "@/lib/session";
import {
  getOnboardingCompletedAt,
  getUserPreferences,
} from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireAuth();
  const [completedAt, preferences] = await Promise.all([
    getOnboardingCompletedAt(session.user.id),
    getUserPreferences(session.user.id),
  ]);
  if (completedAt) redirect("/dashboard");

  return <OnboardingView initialPreferences={preferences} />;
}
