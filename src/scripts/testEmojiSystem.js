/**
 * src/scripts/testEmojiSystem.js
 * Comprehensive test suite for HCC Custom Emoji Discovery & Management System.
 *
 * Validates:
 *   1. 50 Popular Emojis catalog (50 unique, non-vulgar, CC-licensed emojis)
 *   2. Discord emoji name sanitization and alphanumeric regex constraints
 *   3. 256 KB file size limit and format compatibility
 *   4. Content moderation, profanity rejection, and safe tech terms
 *   5. Slot calculation across Discord tiers (50 static + 50 animated)
 *   6. Duplicate prevention against server emojis
 *   7. Administrator authorization whitelist
 */

import assert from 'node:assert';
import {
  Popular50EmojiProvider,
  POPULAR_50_EMOJI_LIST,
} from '../services/emojis/providers/popular50EmojiProvider.js';
import {
  sanitizeDiscordEmojiName,
  checkDiscordEmojiCompatibility,
  verifyEmojiCandidate,
} from '../services/emojis/verificationService.js';
import {
  getGuildMaxEmojiSlots,
  getGuildEmojiSlotInfo,
  uploadSingleEmoji,
} from '../services/emojis/uploadService.js';
import { isStickerAdmin } from '../utils/permissions.js';
import { config } from '../config/index.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 Running HCC 50 Custom Emojis Verification Suite');
console.log('======================================================\n');

// ─── 1. POPULAR 50 EMOJIS CATALOG ─────────────────────────────────────────────
console.log('--- 1. 50 Popular Emojis Catalog ---');

runTest('Catalog contains exactly 50 popular, non-vulgar items', () => {
  assert.strictEqual(POPULAR_50_EMOJI_LIST.length, 50, 'Catalog must contain exactly 50 emojis');
});

runTest('All 50 emoji names are unique and valid Discord identifiers', () => {
  const seen = new Set();
  const nameRegex = /^[a-zA-Z0-9_]{2,32}$/;

  for (const item of POPULAR_50_EMOJI_LIST) {
    assert.ok(!seen.has(item.name), `Duplicate emoji name detected: ${item.name}`);
    seen.add(item.name);
    assert.ok(nameRegex.test(item.name), `Invalid Discord emoji name format: "${item.name}"`);
    assert.ok(item.description, `Emoji ${item.name} missing description`);
    assert.ok(item.trendReason, `Emoji ${item.name} missing trendReason`);
  }
});

await runAsyncTest('Popular50EmojiProvider returns 50 formatted candidates with valid assets', async () => {
  const provider = new Popular50EmojiProvider();
  const candidates = await provider.discover({ limit: 50 });

  assert.strictEqual(candidates.length, 50, 'Should discover all 50 candidates');
  assert.ok(candidates[0].preview_url.startsWith('https://'), 'Must have secure preview URL');
  assert.strictEqual(candidates[0].pack_id, 'popular_50_emojis');
  assert.ok(candidates[0].file_size_bytes <= 256 * 1024, 'Emoji asset must be under 256 KB');
});

// ─── 2. SANITIZATION & DISCORD CONSTRAINTS ───────────────────────────────────
console.log('\n--- 2. Sanitization & Technical Constraints ---');

runTest('Sanitizes arbitrary text into valid Discord emoji name', () => {
  assert.strictEqual(sanitizeDiscordEmojiName('LGTM Ship It!'), 'lgtm_ship_it');
  assert.strictEqual(sanitizeDiscordEmojiName('404 Sleep Not Found'), '404_sleep_not_found');
  assert.strictEqual(sanitizeDiscordEmojiName('a'), 'a_e');
  assert.strictEqual(sanitizeDiscordEmojiName('___canteen___'), 'canteen');
});

runTest('Enforces Discord 256 KB emoji file size constraint', () => {
  const validEmoji = { name: 'lgtm_fast', asset_format: 'png', asset_url: 'https://test.com/img.png', file_size_bytes: 50000 };
  const oversizedEmoji = { name: 'huge_asset', asset_format: 'png', asset_url: 'https://test.com/huge.png', file_size_bytes: 300 * 1024 };

  assert.strictEqual(checkDiscordEmojiCompatibility(validEmoji).valid, true);
  assert.strictEqual(checkDiscordEmojiCompatibility(oversizedEmoji).valid, false);
});

runTest('Rejects spaces in emoji names', () => {
  const badName = { name: 'dev typing fast', asset_format: 'png', asset_url: 'https://test.com/img.png' };
  assert.strictEqual(checkDiscordEmojiCompatibility(badName).valid, false);
});

// ─── 3. CONTENT SAFETY & VERIFICATION ────────────────────────────────────────
console.log('\n--- 3. Content Safety & Licensing Checks ---');

runTest('Rejects profanity or vulgarity in emoji names or descriptions', () => {
  const vulgarEmoji = {
    name: 'shit_code',
    description: 'Vulgar error description',
    trendReason: 'Vulgar meme',
    license: 'CC0-1.0',
    asset_format: 'png',
    asset_url: 'https://test.com/img.png',
  };
  const result = verifyEmojiCandidate(vulgarEmoji);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.contentStatus, 'flagged_profanity');
});

runTest('Passes all 50 popular emojis through the safety verification pipeline', () => {
  const provider = new Popular50EmojiProvider();
  for (const item of POPULAR_50_EMOJI_LIST) {
    const candidate = {
      name: item.name,
      description: item.description,
      trend_reason: item.trendReason,
      license: 'CC-BY-4.0',
      asset_format: 'png',
      asset_url: `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${item.hex}.png`,
      file_size_bytes: 14000,
    };
    const check = verifyEmojiCandidate(candidate);
    assert.strictEqual(check.valid, true, `Emoji "${item.name}" failed verification: ${check.reason}`);
  }
});

// ─── 4. EMOJI SLOTS & DUPLICATES ─────────────────────────────────────────────
console.log('\n--- 4. Discord Emoji Slots & Boost Tiers ---');

runTest('Standard server provides 50 static + 50 animated emoji slots', () => {
  assert.strictEqual(getGuildMaxEmojiSlots({ premiumTier: 0 }), 50, 'Tier 0 = 50 slots');
  assert.strictEqual(getGuildMaxEmojiSlots({ premiumTier: 1 }), 100, 'Tier 1 = 100 slots');
  assert.strictEqual(getGuildMaxEmojiSlots({ premiumTier: 2 }), 150, 'Tier 2 = 150 slots');
  assert.strictEqual(getGuildMaxEmojiSlots({ premiumTier: 3 }), 250, 'Tier 3 = 250 slots');
});

await runAsyncTest('Correctly calculates used and remaining static emoji slots', async () => {
  const mockGuild = {
    premiumTier: 0,
    emojis: {
      fetch: async () => [
        { name: 'lgtm_rocket', animated: false },
        { name: 'party_blob', animated: true },
        { name: 'git_push_pray', animated: false },
      ],
    },
  };

  const slotInfo = await getGuildEmojiSlotInfo(mockGuild);
  assert.strictEqual(slotInfo.max, 50);
  assert.strictEqual(slotInfo.usedStatic, 2);
  assert.strictEqual(slotInfo.usedAnimated, 1);
  assert.strictEqual(slotInfo.remainingStatic, 48);
  assert.strictEqual(slotInfo.remainingAnimated, 49);
  assert.ok(slotInfo.existingNames.has('lgtm_rocket'));
});

await runAsyncTest('Prevents uploading duplicate emoji name', async () => {
  const mockGuild = { name: 'HCC Guild', id: '123' };
  const existingNames = new Set(['lgtm_rocket', 'segfault_damage']);
  const candidate = { id: 'cand-emoji-1', name: 'lgtm_rocket', asset_url: 'https://test.com/img.png' };

  const result = await uploadSingleEmoji(mockGuild, candidate, existingNames);
  assert.strictEqual(result.success, false);
  assert.ok(result.reason.includes('already exists on the server'));
});

// ─── 5. SECURITY & AUTHORIZATION ─────────────────────────────────────────────
console.log('\n--- 5. Security & Authorization ---');

runTest('Restricts emoji approval to configured ADMIN_USER_IDS or server admins', () => {
  const unauthorizedUser = {
    user: { id: '999999999999999999' },
    member: { roles: { cache: new Map() } },
    guild: { ownerId: '111111111111111111' },
  };
  assert.strictEqual(isStickerAdmin(unauthorizedUser), false);
});

console.log('\n======================================================');
console.log(`📊 Test Summary: ${passedTests} / ${totalTests} passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

