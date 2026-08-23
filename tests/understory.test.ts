import { describe, expect, it } from "vitest";
import {
  ensureUnderstoryClosing,
} from "@/lib/understory";
import { getSpeechVoice } from "@/lib/speech";
import { stripModelMarkdownMarkers } from "@/lib/ai-text";

describe("Understory final turn", () => {
  it("removes question sentences from a final reply", () => {
    expect(
      ensureUnderstoryClosing(
        "小吃是方便又好吃的小食品。你想尝尝哪个呢？谢谢你今天的练习。",
        "zh-CN",
      ),
    ).toBe("小吃是方便又好吃的小食品。谢谢你今天的练习。");
  });

  it("uses a target-language closing when no conclusion remains", () => {
    expect(ensureUnderstoryClosing("你想继续吗？", "zh-CN")).toContain(
      "今天的对话就到这里",
    );
  });

  it("keeps a distinct built-in voice for each companion", () => {
    expect(getSpeechVoice("bramble")).toBe("marin");
    expect(getSpeechVoice("mossy")).toBe("cedar");
    expect(getSpeechVoice("narrator")).toBe("marin");
  });

  it("removes model Markdown markers before rendering or saving text", () => {
    expect(stripModelMarkdownMarkers("新的**福利**和__航班__")).toBe(
      "新的福利和航班",
    );
  });
});
