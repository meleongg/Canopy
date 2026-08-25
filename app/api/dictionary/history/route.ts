import {
  clearDictionaryLookupHistory,
  listDictionaryLookupHistory,
} from "@/lib/dictionary";
import { requireApiAuth } from "@/lib/session";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  return Response.json({
    entries: await listDictionaryLookupHistory(auth.session.user.id),
  });
}

export async function DELETE() {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  await clearDictionaryLookupHistory(auth.session.user.id);
  return new Response(null, { status: 204 });
}
