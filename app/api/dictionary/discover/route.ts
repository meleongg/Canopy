import { discoverSharedCharacterCompounds } from "@/lib/dictionary";
import { requireApiAuth } from "@/lib/session";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  return Response.json({
    entries: await discoverSharedCharacterCompounds(auth.session.user.id),
  });
}
