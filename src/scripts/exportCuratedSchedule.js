/**
 * src/scripts/exportCuratedSchedule.js
 * Exports the complete next-week curated 7-day tournament question bank with schedule and answer keys.
 */

import fs from 'node:fs';
import { CHALLENGE_CALENDAR, getDayQuestionSet } from '../services/quiz/sessionQuestionManager.js';

let md = '# HCC 7-Day Challenge: Curated Question & Answer Set (Next Week)\n\n';
md += '> **Event Window:** Monday, 9 Nov 2026 – Sunday, 15 Nov 2026\n';
md += '> **Daily Drop Time:** Every Morning at 09:00 AM IST\n';
md += '> **Session Format:** 10 Questions Daily · 15s Countdown Timer per Question\n';
md += '> **Difficulty Balance:** Exactly 6 Easy / 3 Medium / 1 Challenge per day\n';
md += '> **Rewards:** +10 Points & +20 XP per correct answer · +5 Participation XP\n\n---\n\n';

for (const [date, meta] of Object.entries(CHALLENGE_CALENDAR)) {
  const { questions } = getDayQuestionSet(date);
  md += `## 📅 Day ${meta.dayNumber}: ${meta.topic} — ${meta.dateLabel}\n\n`;
  md += `- **Date & Time:** \`${date} @ 09:00 AM IST\`\n`;
  md += `- **Category:** \`${meta.category}\`\n`;
  md += `- **Total Questions:** 10 Questions (6 Beginner, 3 Intermediate, 1 Advanced/Challenge)\n\n`;

  questions.forEach((q, idx) => {
    md += `### Q${idx + 1}. [${q.difficulty.toUpperCase()}] ${q.questionText}\n\n`;
    if (q.codeSnippet) {
      md += '```javascript\n' + q.codeSnippet + '\n```\n\n';
    }
    q.options.forEach((opt) => {
      const mark = opt.id === q.correctOption ? ' **(Correct Answer ✅)**' : '';
      md += `- **[Option ${opt.id}]** ${opt.text}${mark}\n`;
    });
    md += `\n- **✅ Correct Option:** **Option ${q.correctOption}**\n`;
    md += `- **💡 Explanation:** ${q.explanation}\n`;
    md += `- **⏱️ Question Timer:** ${q.timeLimitSeconds || 15} seconds\n`;
    md += `- **🎁 Rewards:** +${q.pointsReward} Points / +${q.xpReward} XP\n\n`;
  });
  md += '---\n\n';
}

fs.writeFileSync('HCC_Next_Week_Curated_Questions_Schedule.md', md, 'utf-8');
console.log('Successfully generated HCC_Next_Week_Curated_Questions_Schedule.md');

