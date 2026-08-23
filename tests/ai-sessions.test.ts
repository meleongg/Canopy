import { describe, expect, it } from "vitest";
import {
  decodeAiSessionCursor,
  encodeAiSessionCursor,
} from "@/lib/ai-sessions";

describe("AI session cursors", () => {
  it("round-trips the stable created-at and id position", () => {
    const createdAt = new Date("2026-08-23T19:00:00.000Z");
    const cursor = encodeAiSessionCursor({ createdAt, id: "session-2" });

    expect(decodeAiSessionCursor(cursor)).toEqual({
      createdAt,
      id: "session-2",
    });
  });

  it("rejects malformed cursor values", () => {
    expect(decodeAiSessionCursor("not-a-cursor")).toBeNull();
  });
});
