/**
 * src/services/emojis/providers/popular50EmojiProvider.js
 * 50 Popular, Non-Vulgar Gen Z & Tech Emojis Catalog.
 * High-quality, safe, relatable college coding & student life emojis.
 * License: CC0-1.0 / MIT / CC-BY-SA-4.0
 */

import { BaseEmojiProvider } from './baseEmojiProvider.js';

export const POPULAR_50_EMOJI_LIST = [
  // ─── 1. Coding & Tech Memes (18 Emojis) ──────────────────────────────────
  {
    name: 'lgtm_rocket',
    category: 'coding_memes',
    description: 'Looks Good To Me! Ship it to production.',
    trendReason: 'Everyday developer code-review approval in campus tech clubs.',
    hex: '1f680',
  },
  {
    name: 'git_push_pray',
    category: 'coding_memes',
    description: 'Praying before pushing straight to main branch.',
    trendReason: 'Universal developer anxiety reaction during hackathon submission minutes.',
    hex: '1f64f',
  },
  {
    name: 'works_on_my_machine',
    category: 'coding_memes',
    description: 'Junior dev excuse when the build fails on the test server.',
    trendReason: 'Endless developer humor in student project demonstrations.',
    hex: '1f937',
  },
  {
    name: 'segfault_damage',
    category: 'coding_memes',
    description: 'C/C++ Segmentation fault / core dumped emotional damage.',
    trendReason: 'Core memory reaction for every CS student taking data structures in C.',
    hex: '1f480',
  },
  {
    name: 'merge_conflict_boom',
    category: 'coding_memes',
    description: 'Git conflict explosion across 40 files.',
    trendReason: 'Classic group project collision moment when someone rebases late.',
    hex: '1f4a5',
  },
  {
    name: 'dev_typing_fast',
    category: 'coding_memes',
    description: 'Hacker speed typing furiously against the clock.',
    trendReason: 'Fast-paced coding reaction during competitive programming rounds.',
    hex: '1f4bb',
  },
  {
    name: 'debugger_detective',
    category: 'coding_memes',
    description: 'Hunting for an off-by-one error with console.log print statements.',
    trendReason: 'Relatable student debugging strategy before learning gdb or breakpoints.',
    hex: '1f50e',
  },
  {
    name: 'prod_on_fire',
    category: 'coding_memes',
    description: 'Production is down or demo crashed on stage.',
    trendReason: 'Emergency reaction when live software demos unexpectedly fail.',
    hex: '1f525',
  },
  {
    name: 'null_pointer_skull',
    category: 'coding_memes',
    description: 'Java NullPointerException or Python NoneType attribute error.',
    trendReason: 'The single most common bug reaction in freshman coding classes.',
    hex: '2620',
  },
  {
    name: 'spaghetti_code',
    category: 'coding_memes',
    description: 'Nested if-else 12 levels deep that nobody dares to touch.',
    trendReason: 'Humorous acknowledgment of unrefactored hackathon code.',
    hex: '1f35d',
  },
  {
    name: 'terminal_matrix',
    category: 'coding_memes',
    description: 'Running tree or htop in full screen to look like a pro.',
    trendReason: 'Lighthearted computer lab meme when peers watch over your shoulder.',
    hex: '1f4df',
  },
  {
    name: 'coffee_overflow',
    category: 'coding_memes',
    description: 'Turning caffeine directly into functional algorithms.',
    trendReason: 'Indispensable coding beverage reaction across hackathon weekends.',
    hex: '2615',
  },
  {
    name: 'infinite_loop',
    category: 'coding_memes',
    description: 'While true without a break condition freezing the terminal.',
    trendReason: 'Relatable blunder reaction when fans start spinning at 100%.',
    hex: '267e',
  },
  {
    name: 'keyboard_smash',
    category: 'coding_memes',
    description: 'Frustration after missing a single semicolon for two hours.',
    trendReason: 'Cathartic reaction in college Discord when syntax errors resolve.',
    hex: '2328',
  },
  {
    name: 'docker_whale',
    category: 'coding_memes',
    description: 'Containerized peace of mind: it runs anywhere now.',
    trendReason: 'Popular DevOps reaction when moving projects into Docker containers.',
    hex: '1f433',
  },
  {
    name: 'rust_ferris_crab',
    category: 'tech_culture',
    description: 'Rust programming language mascot energy and memory safety.',
    trendReason: 'Trending reaction in modern systems programming discussions.',
    hex: '1f980',
  },
  {
    name: 'python_snake_vibes',
    category: 'coding_memes',
    description: 'Writing in 3 lines of Python what took 50 lines in Java.',
    trendReason: 'Playful language rivalry reaction in campus coding communities.',
    hex: '1f40d',
  },
  {
    name: 'ship_it_fast',
    category: 'coding_memes',
    description: 'Deploying the project with 1 minute left before the portal closes.',
    trendReason: 'Last-gasp victory celebration for competition submissions.',
    hex: '1f6e5',
  },

  // ─── 2. College & Student Life (17 Emojis) ───────────────────────────────
  {
    name: 'four_o_four_sleep',
    category: 'student_life',
    description: 'Sleep 404: Not Found during mid-semester examination week.',
    trendReason: 'Consistently trending student reaction during college exam seasons.',
    hex: '1f634',
  },
  {
    name: 'gpa_crying',
    category: 'student_life',
    description: 'Crying internally after checking the semester grade sheet.',
    trendReason: 'Empathy and mutual support reaction on result announcement days.',
    hex: '1f972',
  },
  {
    name: 'attendance_75_percent',
    category: 'student_life',
    description: 'Calculating the exact number of classes you can bunk.',
    trendReason: 'Universal college survival sport across university campuses.',
    hex: '1f4ca',
  },
  {
    name: 'viva_nervous',
    category: 'student_life',
    description: 'Entering the external lab viva without knowing what project does.',
    trendReason: 'Classic tension reaction during oral defense and practical tests.',
    hex: '1f928',
  },
  {
    name: 'all_nighter_owl',
    category: 'student_life',
    description: 'Staying awake from 11 PM to 7 AM finishing documentation.',
    trendReason: 'College ritual reaction when lab records are due next morning.',
    hex: '1f989',
  },
  {
    name: 'assignment_ctrl_c_v',
    category: 'student_life',
    description: 'Change the variable names so it looks like our own work.',
    trendReason: 'Lighthearted peer collaboration meme for weekly problem sets.',
    hex: '1f4cb',
  },
  {
    name: 'brain_melt',
    category: 'college_reactions',
    description: 'Brain completely melted after a 3-hour theoretical proofs lecture.',
    trendReason: 'Universal reaction during dry afternoon math and theory classes.',
    hex: '1fae0',
  },
  {
    name: 'deadline_panic',
    category: 'student_life',
    description: 'Submission timer counting down: 00:01:42 remaining.',
    trendReason: 'Adrenaline spike meme shared in class group chats.',
    hex: '23f0',
  },
  {
    name: 'last_bench_vibes',
    category: 'college_reactions',
    description: 'Vibing peacefully at the back of the lecture hall.',
    trendReason: 'Celebrated college tradition of relaxing in the back row.',
    hex: '1f60e',
  },
  {
    name: 'hostel_maggi',
    category: 'student_life',
    description: '2 AM instant noodles in the hostel kettle to survive night study.',
    trendReason: 'Unmatched culinary staple of student and engineer hostel life.',
    hex: '1f35c',
  },
  {
    name: 'presentation_sweat',
    category: 'college_reactions',
    description: 'When the professor asks a follow-up question on slide 3.',
    trendReason: 'Shared nervous laughter during seminar and capstone presentations.',
    hex: '1f605',
  },
  {
    name: 'placement_season',
    category: 'student_life',
    description: 'Formal suit, polished resume, and LeetCode grind mode.',
    trendReason: 'High-stakes milestone season for pre-final and final year students.',
    hex: '1f4bc',
  },
  {
    name: 'syllabus_overload',
    category: 'student_life',
    description: 'Finding out the syllabus has 5 whole units with 12 hours left.',
    trendReason: 'Panic-studying reaction right before internal assessment exams.',
    hex: '1f4da',
  },
  {
    name: 'canteen_chai_break',
    category: 'college_reactions',
    description: 'Solving complex architectural dilemmas over a cup of hot tea.',
    trendReason: 'Sacred campus culture of refreshing between continuous classes.',
    hex: '1fad6',
  },
  {
    name: 'library_whisper',
    category: 'student_life',
    description: 'Pretending to study intensely while actually looking at tech memes.',
    trendReason: 'Relatable student pastime in college central libraries.',
    hex: '1f92b',
  },
  {
    name: 'proxy_attendance',
    category: 'student_life',
    description: 'Calling out Present Sir for your roommate who overslept.',
    trendReason: 'Legendary demonstration of unwritten student camaraderie.',
    hex: '1f50a',
  },
  {
    name: 'semester_end_freedom',
    category: 'student_life',
    description: 'Walking out of the last exam hall like a free citizen.',
    trendReason: 'Peak euphoria reaction when vacation officially begins.',
    hex: '1f389',
  },

  // ─── 3. Gen Z Tech Reactions & Internet Culture (15 Emojis) ──────────────
  {
    name: 'vibe_coding',
    category: 'tech_culture',
    description: 'Prompting an AI agent with headphones on and zero worries.',
    trendReason: 'Currently viral Gen Z developer slang for intuitive generative coding.',
    hex: '1f3a7',
  },
  {
    name: 'let_him_cook',
    category: 'tech_culture',
    description: 'Hold on, let this peer cook their brilliant solution.',
    trendReason: 'Massively popular encouraging reaction in modern dev discords.',
    hex: '1f9d1-200d-1f373',
  },
  {
    name: 'skull_dead',
    category: 'college_reactions',
    description: 'I am dead from laughing at this absurd compilation error.',
    trendReason: 'The default Gen Z laughing reaction for funny situations.',
    hex: '1f480',
  },
  {
    name: 'mind_blown',
    category: 'tech_culture',
    description: 'Realizing dynamic programming is just recursion with a cache.',
    trendReason: 'Breakthrough moment reaction when algorithmic concepts click.',
    hex: '1f92f',
  },
  {
    name: 'clown_dev',
    category: 'coding_memes',
    description: 'Spent 4 hours debugging to find out the file wasn\'t saved.',
    trendReason: 'Self-deprecating humorous badge when silly mistakes happen.',
    hex: '1f921',
  },
  {
    name: 'touch_grass',
    category: 'college_reactions',
    description: 'Go outside and touch some actual grass after 14 hours at the desk.',
    trendReason: 'Friendly reminder to step outside and disconnect after long sprints.',
    hex: '1f33f',
  },
  {
    name: 'based_mentor',
    category: 'tech_culture',
    description: 'When the senior or alumni drops profound, realistic industry advice.',
    trendReason: 'Respectful accolade for practical, no-nonsense career guidance.',
    hex: '1f4af',
  },
  {
    name: 'sus_commit',
    category: 'coding_memes',
    description: 'Git commit message: "fixed stuff" modifying 80 files.',
    trendReason: 'Suspicious inspection reaction for questionable PR diffs.',
    hex: '1f914',
  },
  {
    name: 'monke_developer',
    category: 'coding_memes',
    description: 'Where bug? Monke developer trying to understand legacy code.',
    trendReason: 'Endearing internet meme for feeling overwhelmed by huge codebases.',
    hex: '1f412',
  },
  {
    name: 'galaxy_brain',
    category: 'tech_culture',
    description: 'Over-engineering a simple todo app with microservices and Kafka.',
    trendReason: 'Satirical reaction to unnecessary architectural complexity.',
    hex: '1f30c',
  },
  {
    name: 'copium_refill',
    category: 'college_reactions',
    description: 'The professor will definitely curve the marks by 15 percent.',
    trendReason: 'Humorous coping reaction when hoping for generous evaluation.',
    hex: '1f37c',
  },
  {
    name: 'salute_senior',
    category: 'college_reactions',
    description: 'Saluting the senior who handed over their handwritten question bank.',
    trendReason: 'Deep gratitude reaction towards seniors who guide juniors.',
    hex: '1fae1',
  },
  {
    name: 'chad_programmer',
    category: 'tech_culture',
    description: 'Solves the hard problem in 10 lines of clean, readable code.',
    trendReason: 'Playful praise for elegant, unpretentious engineering prowess.',
    hex: '1f4aa',
  },
  {
    name: 'hackathon_trophy',
    category: 'tech_culture',
    description: 'Winning the campus hackathon after 36 hours without sleep.',
    trendReason: 'Peak celebration reaction for team triumphs in tech contests.',
    hex: '1f3c6',
  },
  {
    name: 'ai_agent_spark',
    category: 'tech_culture',
    description: 'AI pair programmer generating the boilerplate instantly.',
    trendReason: 'Excitement around cutting-edge assistant agent tools.',
    hex: '2728',
  },
];

export class Popular50EmojiProvider extends BaseEmojiProvider {
  constructor() {
    super('popular_50_emojis', 'HCC Top 50 Gen Z & Tech Emojis');
  }

  async discover(options = {}) {
    const limit = options.limit || 50;
    const categoryFilter = options.category;

    let items = POPULAR_50_EMOJI_LIST;
    if (categoryFilter) {
      items = items.filter((i) => i.category === categoryFilter);
    }

    const candidates = items.slice(0, limit).map((item) => {
      // Use official high-res Twemoji / OpenMoji SVG/PNG open-access CDNs
      const assetUrl = `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${item.hex}.png`;

      return {
        name: item.name,
        description: item.description,
        pack_id: 'popular_50_emojis',
        pack_name: 'HCC Top 50 Gen Z & Tech Emojis',
        category: item.category,
        preview_url: assetUrl,
        asset_url: assetUrl,
        source_url: `https://github.com/twitter/twemoji/blob/master/assets/72x72/${item.hex}.png`,
        creator: 'HCC Open Community / Twemoji',
        license: 'CC-BY-4.0',
        license_details: 'Creative Commons Attribution 4.0 International (Twemoji / HCC Community)',
        trend_reason: item.trendReason,
        is_animated: false,
        asset_format: 'png',
        file_size_bytes: 14500, // standard 72x72 PNG is ~10-18 KB (well within 256KB)
      };
    });

    return candidates;
  }
}

