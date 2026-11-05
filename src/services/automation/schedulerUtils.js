export function buildDailyQuizCron(postTime = '09:00') {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(postTime);
  if (!match) {
    throw new Error(`Invalid QUIZ_POST_TIME: ${postTime}. Expected HH:MM.`);
  }
  return `${Number(match[2])} ${Number(match[1])} * * *`;
}

export function isSameGuild(channel, guildId) {
  return Boolean(channel?.isTextBased?.() && channel.guildId === guildId);
}
