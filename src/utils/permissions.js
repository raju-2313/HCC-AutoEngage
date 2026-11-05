/**
 * src/utils/permissions.js
 * Helper utilities for permission and role checks.
 */

import { config } from '../config/index.js';

/**
 * Returns true if the interaction member has the configured admin role
 * OR has the ADMINISTRATOR Discord permission.
 */
export function isAdmin(interaction) {
  if (!interaction.member) return false;

  // Check Discord ADMINISTRATOR bit-flag
  if (interaction.memberPermissions?.has('Administrator')) return true;

  // Check the named admin role
  const hasRole = interaction.member.roles?.cache?.some(
    (role) => role.name === config.app.adminRoleName
  );
  return !!hasRole;
}
