import { SettingsView } from "@/app/settings/settings-view";
import { requireAuth } from "@/lib/session";
import { getUserPreferences } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAuth();
  const preferences = await getUserPreferences(session.user.id);

  return (
    <SettingsView initialName={session.user.name} preferences={preferences} />
  );
}
