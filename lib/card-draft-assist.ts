import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { getOpenAIKey, hasOpenAIEnv } from "@/db/env";
import {
  draftFieldsFromDictionaryEntry,
  headwordLengthMessage,
  MAX_ENGLISH_INTENT_CHARS,
  MAX_HEADWORD_HAN_CHARS,
  MAX_SOURCE_CONTEXT_CHARS,
  type CaptureMode,
  type CardDraftAssistResult,
  type CardDraftOption,
} from "@/lib/card-draft";
import { matchDictionaryForCardAutofill } from "@/lib/card-autofill";
import { GARDEN_BOUNDARY_MESSAGE, moderateText } from "@/lib/openai";

type InboundInput = {
  targetText: string;
  sourceContext: string;
};

type OutboundInput = {
  englishIntent: string;
};

type LlmInboundPayload = {
  contextualMeaning?: string;
  sourceSentence?: string;
};

type LlmOutboundOption = {
  register?: string;
  sentence?: string;
  headword?: string;
  glossHint?: string;
};

type LlmOutboundPayload = {
  options?: LlmOutboundOption[];
};

function getClient() {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for card draft assist.");
  }
  return new OpenAI({ apiKey });
}

function normalizeRegister(
  value: string | undefined,
): CardDraftOption["register"] {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "casual" || key === "neutral" || key === "formal") {
    return key;
  }
  return null;
}

function registerLabel(register: CardDraftOption["register"]) {
  if (register === "casual") return "Casual";
  if (register === "formal") return "Formal";
  if (register === "neutral") return "Neutral";
  return null;
}

async function groundHeadword(
  userId: string,
  headword: string,
): Promise<{
  phoneticReading: string;
  definitions: string;
  dictionaryEntryId: string | null;
  grounded: boolean;
  helpMessage: string | null;
}> {
  const trimmed = headword.trim();
  const lengthHelp = headwordLengthMessage(trimmed);
  if (lengthHelp) {
    return {
      phoneticReading: "",
      definitions: "",
      dictionaryEntryId: null,
      grounded: false,
      helpMessage: lengthHelp,
    };
  }

  const autofill = await matchDictionaryForCardAutofill(userId, trimmed);
  const exact = autofill.matches.find((match) => match.matchKind === "exact");
  const best = exact ?? autofill.matches[0];
  if (!best) {
    return {
      phoneticReading: "",
      definitions: "",
      dictionaryEntryId: null,
      grounded: false,
      helpMessage: autofill.helpMessage,
    };
  }

  const fields = draftFieldsFromDictionaryEntry(best);
  return {
    phoneticReading: fields.phoneticReading,
    definitions: fields.definitions,
    dictionaryEntryId: fields.dictionaryEntryId ?? null,
    grounded: Boolean(exact) || best.matchKind === "exact",
    helpMessage: autofill.helpMessage,
  };
}

async function completeJson(system: string, user: string) {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.35,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = completion.choices[0]?.message.content ?? "{}";
  return JSON.parse(content) as unknown;
}

export async function assistInboundCardDraft(
  userId: string,
  input: InboundInput,
): Promise<CardDraftAssistResult> {
  if (!hasOpenAIEnv()) {
    throw new Error("OPENAI_API_KEY is required for card draft assist.");
  }

  const targetText = input.targetText.trim();
  const sourceContext = input.sourceContext.trim();
  if (!targetText || !sourceContext) {
    throw new Error("Inbound draft needs a target phrase and surrounding context.");
  }
  if (sourceContext.length > MAX_SOURCE_CONTEXT_CHARS) {
    throw new Error(
      `Keep surrounding context to ${MAX_SOURCE_CONTEXT_CHARS} characters or fewer.`,
    );
  }
  const lengthHelp = headwordLengthMessage(targetText);
  if (lengthHelp) {
    return {
      mode: "inbound",
      options: [],
      helpMessage: lengthHelp,
    };
  }

  const moderation = await moderateText(`${targetText}\n${sourceContext}`);
  if (moderation.flagged) {
    throw new Error(GARDEN_BOUNDARY_MESSAGE);
  }

  const parsed = (await completeJson(
    [
      "You help Mandarin learners capture vocabulary from authentic context.",
      "Return compact JSON with keys: contextualMeaning (English explanation of the target specifically in the given context, noting tone/register when useful), sourceSentence (the learner's surrounding sentence, lightly cleaned if needed).",
      "Do not invent CC-CEDICT definitions. Do not include proprietary dictionary text.",
      `Keep any suggested headword at most ${MAX_HEADWORD_HAN_CHARS} Chinese characters.`,
    ].join(" "),
    JSON.stringify({ targetText, sourceContext }),
  )) as LlmInboundPayload;

  const grounded = await groundHeadword(userId, targetText);
  const contextualMeaning = (parsed.contextualMeaning ?? "").trim();
  const sourceSentence = (parsed.sourceSentence ?? sourceContext).trim();

  const option: CardDraftOption = {
    id: randomUUID(),
    register: null,
    registerLabel: null,
    headword: targetText,
    phoneticReading: grounded.phoneticReading,
    definitions: grounded.definitions,
    contextualMeaning,
    sourceSentence,
    dictionaryEntryId: grounded.dictionaryEntryId,
    grounded: grounded.grounded,
  };

  const helpParts = [
    grounded.grounded
      ? null
      : grounded.definitions
        ? "Closest CC-CEDICT match applied—confirm the reading and gloss before saving."
        : "No CC-CEDICT match for this headword yet. Add a gloss manually before saving.",
    grounded.helpMessage,
  ].filter(Boolean);

  return {
    mode: "inbound",
    options: [option],
    helpMessage: helpParts[0] ?? null,
  };
}

export async function assistOutboundCardDraft(
  userId: string,
  input: OutboundInput,
): Promise<CardDraftAssistResult> {
  if (!hasOpenAIEnv()) {
    throw new Error("OPENAI_API_KEY is required for card draft assist.");
  }

  const englishIntent = input.englishIntent.trim();
  if (!englishIntent) {
    throw new Error("Outbound draft needs an English phrase or intent.");
  }
  if (englishIntent.length > MAX_ENGLISH_INTENT_CHARS) {
    throw new Error(
      `Keep the English intent to ${MAX_ENGLISH_INTENT_CHARS} characters or fewer.`,
    );
  }

  const moderation = await moderateText(englishIntent);
  if (moderation.flagged) {
    throw new Error(GARDEN_BOUNDARY_MESSAGE);
  }

  const parsed = (await completeJson(
    [
      "You help English-speaking Mandarin learners produce natural phrasing.",
      "Return compact JSON: { options: [{ register: casual|neutral|formal, sentence, headword, glossHint }] }.",
      "Provide 1 or 2 options with different register when useful.",
      "sentence is natural Mandarin. headword is the key vocabulary token to study (Simplified Chinese).",
      `headword must be at most ${MAX_HEADWORD_HAN_CHARS} Chinese characters.`,
      "glossHint is a short English gloss for that headword, not a proprietary dictionary dump.",
      "Do not invent CC-CEDICT entries; grounding happens separately.",
    ].join(" "),
    JSON.stringify({ englishIntent }),
  )) as LlmOutboundPayload;

  const rawOptions = (parsed.options ?? []).slice(0, 2);
  const options: CardDraftOption[] = [];
  let helpMessage: string | null = null;

  for (const raw of rawOptions) {
    const headword = (raw.headword ?? "").trim();
    const sentence = (raw.sentence ?? "").trim();
    if (!headword || !sentence) continue;

    const lengthHelp = headwordLengthMessage(headword);
    if (lengthHelp) {
      helpMessage = lengthHelp;
      continue;
    }

    const grounded = await groundHeadword(userId, headword);
    const register = normalizeRegister(raw.register);
    const glossHint = (raw.glossHint ?? "").trim();

    options.push({
      id: randomUUID(),
      register,
      registerLabel: registerLabel(register),
      headword,
      phoneticReading: grounded.phoneticReading,
      definitions: grounded.definitions || glossHint,
      contextualMeaning: glossHint
        ? `${registerLabel(register) ?? "Option"}: ${glossHint}`
        : `Natural phrasing for: ${englishIntent}`,
      sourceSentence: sentence,
      dictionaryEntryId: grounded.dictionaryEntryId,
      grounded: grounded.grounded,
    });

    if (!grounded.grounded && !helpMessage) {
      helpMessage =
        grounded.helpMessage ??
        "One or more options need a manual gloss—CC-CEDICT did not exact-match the headword.";
    }
  }

  if (options.length === 0) {
    return {
      mode: "outbound",
      options: [],
      helpMessage:
        helpMessage ??
        "No usable Mandarin options came back. Try a shorter intent, or add the card manually.",
    };
  }

  return {
    mode: "outbound",
    options,
    helpMessage,
  };
}

export async function assistCardDraft(
  userId: string,
  mode: CaptureMode,
  input: Partial<InboundInput & OutboundInput>,
): Promise<CardDraftAssistResult> {
  if (mode === "inbound") {
    return assistInboundCardDraft(userId, {
      targetText: input.targetText ?? "",
      sourceContext: input.sourceContext ?? "",
    });
  }
  return assistOutboundCardDraft(userId, {
    englishIntent: input.englishIntent ?? "",
  });
}
