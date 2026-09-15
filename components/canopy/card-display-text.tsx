"use client";

import { useCanopyTheme } from "@/app/providers";
import type { WorkspaceCard } from "@/components/canopy/types";
import { displayCardText } from "@/lib/script-variants";

export function CardDisplayText({ card }: { card: WorkspaceCard }) {
  const { chineseScript } = useCanopyTheme();
  return displayCardText(card, chineseScript);
}
