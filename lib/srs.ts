export type Sm2State = {
  interval: number;
  repetition: number;
  easiness: number;
};

export function calculateSm2(
  state: Sm2State,
  quality: number,
): Sm2State & { nextReviewAt: Date; lastReviewedAt: Date } {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const lastReviewedAt = new Date();
  let interval = state.interval;
  let repetition = state.repetition;

  const easinessDelta = 100 * (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const easiness = Math.max(130, Math.round(state.easiness + easinessDelta));

  if (q < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * (easiness / 100)));
    }
  }

  const nextReviewAt = new Date(lastReviewedAt);
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    interval,
    repetition,
    easiness,
    nextReviewAt,
    lastReviewedAt,
  };
}
