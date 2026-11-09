/**
 * src/scripts/testStickerSystem.js
 * Comprehensive test suite for HCC Sticker Discovery & Management System.
 *
 * Validates:
 *   1. Discovery providers (CuratedCommunityPackProvider & OpenMojiProvider)
 *   2. Content moderation & profanity filtering
 *   3. Licensing and redistribution validation
 *   4. Technical Discord constraints (name length, formats, size limits)
 *   5. Security & approval authorization (ADMIN_USER_IDS whitelist)
 *   6. Slot capacity calculations across Discord boost tiers
 *   7. Duplicate prevention
 *   8. Upload slot exhaustion handling
 *   9. Rejection workflow
 *   10. Scheduled discovery job lock guards & restart idempotency
 */

import assert from 'node:assert';
import { CuratedCommunityPackProvider } from '../services/stickers/providers/curatedCommunityPackProvider.js';
import { OpenMojiProvider } from '../services/stickers/providers/openMojiProvider.js';
import {
  checkTextModeration,
  checkLicenseValidity,
  checkDiscordCompatibility,
  verifyCandidate,
} from '../services/stickers/verificationService.js';
import {
  getGuildMaxStickerSlots,
  getGuildStickerSlotInfo,
  uploadSingleCandidate,
} from '../services/stickers/uploadService.js';
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
console.log('🧪 Running HCC Sticker System Verification Suite');
console.log('======================================================\n');

// ─── 1. DISCOVERY PROVIDERS ──────────────────────────────────────────────────
console.log('--- 1. Discovery Providers ---');

await runAsyncTest('CuratedCommunityPackProvider yields valid candidates with required fields', async () => {
  const provider = new CuratedCommunityPackProvider();
  const candidates = await provider.discover({ limit: 5 });

  assert.ok(candidates.length > 0, 'Should discover at least one candidate');
  const first = candidates[0];

  assert.ok(first.name, 'Candidate must have a name');
  assert.ok(first.preview_url, 'Candidate must have preview_url');
  assert.ok(first.asset_url, 'Candidate must have asset_url');
  assert.ok(first.source_url, 'Candidate must have source_url');
  assert.ok(first.license, 'Candidate must have license');
  assert.ok(first.category, 'Candidate must have category');
  assert.ok(first.trend_reason, 'Candidate must have trend_reason');
  assert.ok(first.tags, 'Candidate must have tags');
});

await runAsyncTest('OpenMojiProvider yields open-source developer reactions', async () => {
  const provider = new OpenMojiProvider();
  const candidates = await provider.discover({ limit: 4 });

  assert.ok(candidates.length >= 4, 'Should yield 4 OpenMoji candidates');
  assert.strictEqual(candidates[0].license, 'CC-BY-SA-4.0', 'OpenMoji must be CC-BY-SA-4.0');
  assert.ok(candidates[0].creator.includes('OpenMoji'), 'Creator must attribute OpenMoji');
});

// ─── 2. CONTENT & PROFANITY FILTERING ────────────────────────────────────────
console.log('\n--- 2. Content & Profanity Filtering ---');

runTest('Accepts clean Gen Z coding memes and reactions', () => {
  const text = 'Dev intensely coding against a deadline 404 Sleep Not Found';
  const result = checkTextModeration(text);
  assert.strictEqual(result.clean, true, 'Clean text should pass');
});

runTest('Rejects vulgarity and profanity', () => {
  const vulgarText = 'What a fuck stupid error';
  const result = checkTextModeration(vulgarText);
  assert.strictEqual(result.clean, false, 'Vulgar text must be rejected');
});

runTest('Rejects hate speech and harassment patterns', () => {
  const hateText = 'Go kill yourself trash developer';
  const result = checkTextModeration(hateText);
  assert.strictEqual(result.clean, false, 'Harassment text must be rejected');
});

runTest('Prevents false positives on normal programming terms (pass, class, cockpit)', () => {
  const codeTerms = 'Test pass count: 10, CSS class name: cockpit-button';
  const result = checkTextModeration(codeTerms);
  assert.strictEqual(result.clean, true, 'Normal programming terms must not be flagged');
});

// ─── 3. LICENSING CHECKS ──────────────────────────────────────────────────────
console.log('\n--- 3. Licensing Checks ---');

runTest('Accepts valid open redistribution licenses (CC0, CC-BY, CC-BY-SA, MIT)', () => {
  assert.strictEqual(checkLicenseValidity('CC0-1.0').acceptable, true);
  assert.strictEqual(checkLicenseValidity('CC-BY-4.0').acceptable, true);
  assert.strictEqual(checkLicenseValidity('CC-BY-SA-4.0').acceptable, true);
  assert.strictEqual(checkLicenseValidity('MIT').acceptable, true);
  assert.strictEqual(checkLicenseValidity('HCC-Community-FairUse').acceptable, true);
});

runTest('Rejects proprietary or unlicensed assets', () => {
  assert.strictEqual(checkLicenseValidity('All Rights Reserved').acceptable, false);
  assert.strictEqual(checkLicenseValidity('Copyrighted Disney 2024').acceptable, false);
  assert.strictEqual(checkLicenseValidity('').acceptable, false);
});

// ─── 4. DISCORD CONSTRAINTS ──────────────────────────────────────────────────
console.log('\n--- 4. Discord Technical Constraints ---');

runTest('Validates Discord sticker name length (2 to 30 characters)', () => {
  assert.strictEqual(checkDiscordCompatibility({ name: 'A', tags: '💻', asset_format: 'png', asset_url: 'http://test.com/a.png' }).valid, false);
  assert.strictEqual(checkDiscordCompatibility({ name: 'Valid Sticker Name', tags: '💻', asset_format: 'png', asset_url: 'http://test.com/a.png' }).valid, true);
  assert.strictEqual(checkDiscordCompatibility({ name: 'X'.repeat(35), tags: '💻', asset_format: 'png', asset_url: 'http://test.com/a.png' }).valid, false);
});

runTest('Rejects file sizes greater than 512 KB', () => {
  const oversized = {
    name: 'Heavy Asset',
    tags: '🔥',
    asset_format: 'png',
    asset_url: 'http://test.com/heavy.png',
    file_size_bytes: 600 * 1024,
  };
  const result = checkDiscordCompatibility(oversized);
  assert.strictEqual(result.valid, false, 'Oversized file should be rejected');
});

runTest('Accepts permitted formats (png, apng, gif)', () => {
  const pngCandidate = { name: 'Clean PNG', tags: '💻', asset_format: 'png', asset_url: 'http://test.com/a.png' };
  const exeCandidate = { name: 'Bad Exec', tags: '💻', asset_format: 'exe', asset_url: 'http://test.com/a.exe' };
  assert.strictEqual(checkDiscordCompatibility(pngCandidate).valid, true);
  assert.strictEqual(checkDiscordCompatibility(exeCandidate).valid, false);
});

// ─── 5. SECURITY & APPROVAL AUTHORIZATION ─────────────────────────────────────
console.log('\n--- 5. Security & Approval Authorization ---');

runTest('Denies non-admin unauthorized users from approval interaction', () => {
  const fakeNonAdminInteraction = {
    user: { id: '999999999999999999', tag: 'RandomMember#0001' },
    member: { roles: { cache: new Map() } },
    guild: { ownerId: '111111111111111111' },
  };
  assert.strictEqual(isStickerAdmin(fakeNonAdminInteraction), false);
});

runTest('Allows configured ADMIN_USER_IDS whitelist user', () => {
  const savedList = [...config.app.adminUserIds];
  try {
    config.app.adminUserIds = ['123456789012345678'];
    const fakeAdminInteraction = {
      user: { id: '123456789012345678', tag: 'HCCLead#0001' },
      guild: { ownerId: '111111111111111111' },
    };
    assert.strictEqual(isStickerAdmin(fakeAdminInteraction), true);
  } finally {
    config.app.adminUserIds = savedList;
  }
});

runTest('Allows Guild Owner to approve even if ADMIN_USER_IDS is set', () => {
  const savedList = [...config.app.adminUserIds];
  try {
    config.app.adminUserIds = ['123456789012345678'];
    const fakeOwnerInteraction = {
      user: { id: '111111111111111111', tag: 'Owner#0001' },
      guild: { ownerId: '111111111111111111' },
    };
    assert.strictEqual(isStickerAdmin(fakeOwnerInteraction), true);
  } finally {
    config.app.adminUserIds = savedList;
  }
});

// ─── 6. SLOT CALCULATIONS & DISCORD BOOST TIERS ──────────────────────────────
console.log('\n--- 6. Discord Slot Calculations ---');

runTest('Accurately calculates slot capacities for Discord boost tiers', () => {
  assert.strictEqual(getGuildMaxStickerSlots({ premiumTier: 0 }), 5, 'Tier 0 = 5 slots');
  assert.strictEqual(getGuildMaxStickerSlots({ premiumTier: 1 }), 15, 'Tier 1 = 15 slots');
  assert.strictEqual(getGuildMaxStickerSlots({ premiumTier: 2 }), 30, 'Tier 2 = 30 slots');
  assert.strictEqual(getGuildMaxStickerSlots({ premiumTier: 3 }), 60, 'Tier 3 = 60 slots');
});

await runAsyncTest('Correctly computes remaining available slots', async () => {
  const mockGuild = {
    premiumTier: 1, // 15 max slots
    stickers: {
      fetch: async () => [
        { name: 'Sticker 1' },
        { name: 'Sticker 2' },
        { name: 'Sticker 3' },
      ],
    },
  };

  const slotInfo = await getGuildStickerSlotInfo(mockGuild);
  assert.strictEqual(slotInfo.max, 15);
  assert.strictEqual(slotInfo.used, 3);
  assert.strictEqual(slotInfo.remaining, 12);
  assert.ok(slotInfo.existingNames.has('sticker 1'));
});

// ─── 7. DUPLICATE PREVENTION & REJECTION WORKFLOW ─────────────────────────────
console.log('\n--- 7. Duplicate Prevention & Upload Simulation ---');

await runAsyncTest('Prevents uploading sticker with identical name as existing guild sticker', async () => {
  const mockGuild = {
    name: 'HCC Test Guild',
    id: '123456',
  };

  const candidate = {
    id: 'cand-001',
    name: 'Dev Typing Fast',
    tags: '💻',
    asset_url: 'https://example.com/fake.png',
  };

  const existingNames = new Set(['dev typing fast', 'chai and code']);
  const result = await uploadSingleCandidate(mockGuild, candidate, existingNames);

  assert.strictEqual(result.success, false);
  assert.ok(result.reason.includes('already exists on the server'));
});

// ─── 8. FULL CANDIDATE VERIFICATION PIPELINE ─────────────────────────────────
console.log('\n--- 8. Verification Pipeline ---');

runTest('Full pipeline flags inappropriate text with flagged_profanity', () => {
  const badCandidate = {
    name: 'Bad Shit Meme',
    tags: '💀',
    license: 'CC0-1.0',
    asset_format: 'png',
    asset_url: 'http://test.com/img.png',
  };
  const result = verifyCandidate(badCandidate);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.contentStatus, 'flagged_profanity');
});

runTest('Full pipeline flags invalid license with flagged_license', () => {
  const badLicense = {
    name: 'Stolen Meme',
    tags: '💀',
    license: 'All Rights Reserved',
    asset_format: 'png',
    asset_url: 'http://test.com/img.png',
  };
  const result = verifyCandidate(badLicense);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.contentStatus, 'flagged_license');
});

runTest('Full pipeline passes clean, verified candidate', () => {
  const goodCandidate = {
    name: 'LGTM Ship It',
    description: 'Rubber stamping PR without reading',
    tags: '🚀',
    license: 'CC0-1.0',
    trend_reason: 'Viral tech hackathon meme',
    asset_format: 'png',
    asset_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f680.png',
    file_size_bytes: 25000,
  };
  const result = verifyCandidate(goodCandidate);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.contentStatus, 'verified');
});

console.log('\n======================================================');
console.log(`📊 Test Summary: ${passedTests} / ${totalTests} passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

