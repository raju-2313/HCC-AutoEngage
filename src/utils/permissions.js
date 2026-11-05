/**
 * src/utils/permissions.js
 * Helper utilities for permission and role checks.
 */

import { config } from '../config/index.js';

const ALLOWED_ADMIN_ROLES = [
  config.app.adminRoleName,
  'HCC Moderator',
  'HCC Admin',
  'Moderator',
  'Admin',
].filter(Boolean);

/**
 * Returns true if the interaction member has:
 *  1. Guild Owner status
 *  2. ADMINISTRATOR or MANAGE_GUILD Discord permissions
 *  3. The configured admin/moderator role (e.g. 'HCC Moderator')
 */
export function isAdmin(interaction) {
  if (!interaction.member) return false;

  // 1. Guild owner always has access
  if (interaction.guild && interaction.guild.ownerId === interaction.user.id) {
    return true;
  }

  // 2. Check Discord permissions bit-flags
  if (interaction.memberPermissions?.has('Administrator')) return true;
  if (interaction.memberPermissions?.has('ManageGuild')) return true;

  // 3. Find matching roles in the guild
  const guildRoles = interaction.guild?.roles?.cache;
  const targetRoleIds = guildRoles
    ? Array.from(guildRoles.values())
        .filter((r) => ALLOWED_ADMIN_ROLES.some((name) => name.toLowerCase() === r.name.toLowerCase()))
        .map((r) => r.id)
    : [];

  // Check member role cache (GuildMemberRoleManager)
  if (interaction.member.roles?.cache) {
    const hasRoleByName = interaction.member.roles.cache.some((role) =>
      ALLOWED_ADMIN_ROLES.some((name) => name.toLowerCase() === role.name.toLowerCase())
    );
    if (hasRoleByName) return true;

    const hasRoleById = targetRoleIds.some((id) => interaction.member.roles.cache.has(id));
    if (hasRoleById) return true;
  }

  // Check raw roles array if member roles is an array of IDs
  if (Array.isArray(interaction.member.roles)) {
    const hasRawRoleId = interaction.member.roles.some((roleId) => targetRoleIds.includes(roleId));
    if (hasRawRoleId) return true;
  }

  return false;
}
