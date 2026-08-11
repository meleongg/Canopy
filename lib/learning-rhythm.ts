export type LearningRhythmDay = {
  date: string;
  reviewCount: number;
  practiceCount: number;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildLearningRhythm(
  reviewDates: Date[],
  practiceDates: Date[],
  now = new Date(),
): LearningRhythmDay[] {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - offset));
    return { date: dateKey(date), reviewCount: 0, practiceCount: 0 };
  });
  const dayByDate = new Map(days.map((day) => [day.date, day]));

  for (const reviewedAt of reviewDates) {
    const day = dayByDate.get(dateKey(reviewedAt));
    if (day) day.reviewCount += 1;
  }
  for (const practicedAt of practiceDates) {
    const day = dayByDate.get(dateKey(practicedAt));
    if (day) day.practiceCount += 1;
  }

  return days;
}
