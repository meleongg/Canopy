import { z } from "zod";
import { deleteCard, patchCard } from "@/lib/cards";
import { requireApiAuth } from "@/lib/session";

const patchSchema = z
  .object({
    archived: z.boolean().optional(),
    targetText: z.string().trim().min(1).max(500).optional(),
    phoneticReading: z
      .array(z.string().trim().min(1).max(100))
      .max(100)
      .optional(),
    definitions: z
      .array(z.string().trim().min(1).max(1_000))
      .min(1)
      .max(100)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one card update.",
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const { cardId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Provide a valid card update." },
      { status: 400 },
    );
  }

  const card = await patchCard(auth.session.user.id, cardId, parsed.data);
  if (!card) return new Response("Card not found.", { status: 404 });
  return Response.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const { cardId } = await context.params;
  const card = await deleteCard(auth.session.user.id, cardId);
  if (!card) return new Response("Card not found.", { status: 404 });
  return Response.json({ success: true });
}
