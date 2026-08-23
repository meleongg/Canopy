"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContextualDictionaryEntry } from "@/lib/dictionary-help";

export function useDictionaryHelp({
  enabled,
  scopeKey,
  texts,
}: {
  enabled: boolean;
  scopeKey: string;
  texts: string[];
}) {
  const cache = useRef(new Map<string, ContextualDictionaryEntry[]>());
  const requests = useRef(new Map<string, AbortController>());
  const activeScope = useRef(scopeKey);
  const [entriesByText, setEntriesByText] = useState<
    Map<string, ContextualDictionaryEntry[]>
  >(new Map());
  const textKey = useMemo(() => [...new Set(texts)].join("\u0000"), [texts]);
  const uniqueTexts = useMemo(
    () => (textKey ? textKey.split("\u0000") : []),
    [textKey],
  );

  useEffect(() => {
    if (activeScope.current === scopeKey) return;
    requests.current.forEach((controller) => controller.abort());
    requests.current.clear();
    cache.current.clear();
    activeScope.current = scopeKey;
    setEntriesByText(new Map());
  }, [scopeKey]);

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
      const requestScope = activeScope.current;
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
          if (
            controller.signal.aborted ||
            activeScope.current !== requestScope
          ) {
            return;
          }
          cache.current.set(text, payload.entries);
          setEntriesByText(new Map(cache.current));
        })
        .catch(() => undefined)
        .finally(() => {
          if (requests.current.get(text) === controller) {
            requests.current.delete(text);
          }
        });
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
