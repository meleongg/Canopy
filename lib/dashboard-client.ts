import type { LearningRhythmDay } from "@/lib/learning-rhythm";

export async function fetchDashboardLearningRhythm() {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as {
    learningRhythm: LearningRhythmDay[];
  };
  return payload.learningRhythm;
}
