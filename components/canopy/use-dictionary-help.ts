"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContextualDictionaryEntry } from "@/lib/dictionary-help";

export function useDictionaryHelp({
  enabled,
  texts,
}: {
  enabled: boolean;
  texts: string[];
}) {
  const cache = useRef(new Map<string, ContextualDictionaryEntry[]>());
  const requests = useRef(new Map<string, AbortController>());
  const [entriesByText, setEntriesByText] = useState<
    Map<string, ContextualDictionaryEntry[]>
  >(new Map());
  const textKey = useMemo(() => [...new Set(texts)].join("\u0000"), [texts]);
  const uniqueTexts = useMemo(
    () => (textKey ? textKey.split("\u0000") : []),
    [textKey],
  );

  useEffect(() => {
    if (!enabled) {
      requests.current.forEach((controller) => controller.abort());
      requests.current.clear();
      return;
    }

    for (const text of uniqueTexts) {
      if (
        !text.match(/\p{Script=Han}/u) ||
        cache.current.has(text) ||
        requests.current.has(text)
      ) {
        continue;
      }
      const controller = new AbortController();
      requests.current.set(text, controller);
      void fetch("/api/dictionary/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok ? response.json() : { entries: [] },
        )
        .then((payload: { entries: ContextualDictionaryEntry[] }) => {
          if (controller.signal.aborted) return;
          cache.current.set(text, payload.entries);
          setEntriesByText(new Map(cache.current));
        })
        .catch(() => undefined)
        .finally(() => requests.current.delete(text));
    }
  }, [enabled, uniqueTexts]);

  useEffect(
    () => () => {
      requests.current.forEach((controller) => controller.abort());
    },
    [],
  );

  return entriesByText;
}
