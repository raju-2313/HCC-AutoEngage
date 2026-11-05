export function calculateDailyStreak(currentStreak, lastQuizDate, today) {
  if (!lastQuizDate) return 1;
  if (lastQuizDate === today) return currentStreak;

  const previous = new Date(`${lastQuizDate}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);
  const daysSincePrevious = Math.round((current - previous) / 86_400_000);
  return daysSincePrevious === 1 ? currentStreak + 1 : 1;
}
