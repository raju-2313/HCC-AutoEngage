/**
 * src/services/stickers/providers/openMojiProvider.js
 * OpenMoji open-source emoji & reaction sticker discovery provider.
 * License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
 * Source: https://openmoji.org / https://github.com/hfg-gmuend/openmoji
 */

import { BaseStickerProvider } from './baseProvider.js';

// Curated verified catalog of OpenMoji developer & student life reaction assets
const OPENMOJI_CATALOG = [
  {
    hex: '1F9D1-200D-1F4BB',
    name: 'Dev Typing Fast',
    tags: '💻',
    category: 'coding_memes',
    description: 'Developer intensely coding against a deadline.',
    trendReason: 'Trending reaction in hackathons, late-night sprint submissions, and debugging channels.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F9D1-200D-1F4BB/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F9D1-200D-1F4BB.png',
  },
  {
    hex: '1F92F',
    name: 'Mind Blown Regex',
    tags: '🤯',
    category: 'coding_memes',
    description: 'Reaction to regex parsing or compiler pointer magic.',
    trendReason: 'Everyday tech reaction when a complex algorithm or one-liner finally clicks.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F92F/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F92F.png',
  },
  {
    hex: '1F525',
    name: 'Prod On Fire',
    tags: '🔥',
    category: 'coding_memes',
    description: 'Production is down or build pipeline failed.',
    trendReason: 'Standard developer emergency meme when Friday deployments go haywire.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F525/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F525.png',
  },
  {
    hex: '1F972',
    name: 'Smiling Through Tears',
    tags: '🥲',
    category: 'student_life',
    description: 'Surviving semester finals and viva examinations.',
    trendReason: 'Relatable student reaction when passing a core course with exactly 40%.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F972/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F972.png',
  },
  {
    hex: '1F916',
    name: 'AI Agent Vibe',
    tags: '🤖',
    category: 'tech_culture',
    description: 'Chatbot and autonomous agent vibes in campus tech discussions.',
    trendReason: 'Popular with students experimenting with LLM agents and autonomous systems.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F916/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F916.png',
  },
  {
    hex: '2615',
    name: 'Chai and Code',
    tags: '☕',
    category: 'college_reactions',
    description: 'Essential tea/coffee fuel for competitive programming.',
    trendReason: 'Campus staple reaction for morning coding clubs and hackathon breaks.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-2615/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/2615.png',
  },
  {
    hex: '1F980',
    name: 'Ferris Rust Vibe',
    tags: '🦀',
    category: 'tech_culture',
    description: 'Rust programming language mascot energy.',
    trendReason: 'Enthusiastically used when discussing memory safety, borrow checkers, and systems programming.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F980/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F980.png',
  },
  {
    hex: '1F4A5',
    name: 'Merge Conflict Boom',
    tags: '💥',
    category: 'coding_memes',
    description: 'Head-to-head git rebase or git push --force collision.',
    trendReason: 'Universal group-project nightmare reaction when two team members edit main simultaneously.',
    creator: 'OpenMoji / HfG Schwäbisch Gmünd',
    license: 'CC-BY-SA-4.0',
    sourceUrl: 'https://openmoji.org/library/emoji-1F4A5/',
    assetUrl: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/png/512x512/1F4A5.png',
  },
];

export class OpenMojiProvider extends BaseStickerProvider {
  constructor() {
    super('openmoji', 'OpenMoji Open Source Catalog');
  }

  async discover(options = {}) {
    const limit = options.limit || 10;
    const categoryFilter = options.category;

    let items = OPENMOJI_CATALOG;
    if (categoryFilter) {
      items = items.filter((item) => item.category === categoryFilter);
    }

    const candidates = items.slice(0, limit).map((item) => ({
      name: item.name,
      description: item.description,
      tags: item.tags,
      pack_id: 'openmoji_campus_dev',
      pack_name: 'OpenMoji Tech & Campus Pack',
      category: item.category,
      preview_url: item.assetUrl,
      asset_url: item.assetUrl,
      source_url: item.sourceUrl,
      creator: item.creator,
      license: item.license,
      license_details: 'Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) by OpenMoji',
      trend_reason: item.trendReason,
      asset_format: 'png',
      file_size_bytes: 42000, // standard 512x512 OpenMoji PNG is ~30-50 KB
    }));

    return candidates;
  }
}

