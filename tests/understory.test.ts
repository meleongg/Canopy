import { describe, expect, it } from "vitest";
import { ensureUnderstoryClosing } from "@/lib/understory";

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
});
