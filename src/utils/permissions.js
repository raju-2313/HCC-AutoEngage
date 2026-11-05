/**
 * src/utils/permissions.js
 * Helper utilities for permission and role checks.
 */

import { config } from '../config/index.js';

/**
 * Returns true if the interaction member has the configured admin role
 * OR has the ADMINISTRATOR Discord permission.
 *
 * Note: role-cache lookup requires GuildMembers privileged intent (Phase 6+).
 * In Phase 1 we fall back to the ADMINISTRATOR bit-flag only.
 */
export function isAdmin(interaction) {
  if (!interaction.member) return false;

  // Check Discord ADMINISTRATOR bit-flag (always available from interaction data)
  if (interaction.memberPermissions?.has('Administrator')) return true;

  // Check the named admin role (requires GuildMembers intent – Phase 6+)
  const hasRole = interaction.member.roles?.cache?.some(
    (role) => role.name === config.app.adminRoleName
  );
  return !!hasRole;
}

