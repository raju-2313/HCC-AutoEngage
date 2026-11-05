/**
 * src/database/client.js
 * Secure singleton initialization for Supabase client.
 *
 * Provides:
 *  - supabaseAdmin: Uses service_role key to bypass RLS for bot backend transactions.
 *  - supabasePublic: Uses anon key (if available) for client-like public queries.
 *  - testDatabaseConnection(): Diagnostic ping to confirm database reachability without leaking keys.
 */

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let adminClient = null;
let publicClient = null;

/**
 * Returns the Supabase service-role client (singleton).
 * Bypasses RLS for automated bot transactions, awards, and admin tasks.
 */
export function getAdminClient() {
  if (!adminClient) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase URL or Service Role Key is missing in config.');
    }

    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket,
      },
    });
  }
  return adminClient;
}

/**
 * Returns the Supabase public (anon) client (singleton).
 * Respects RLS policies.
 */
export function getPublicClient() {
  if (!publicClient) {
    const key = config.supabase.anonKey || config.supabase.serviceRoleKey;
    publicClient = createClient(config.supabase.url, key, {
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: WebSocket,
      },
    });
  }
  return publicClient;
}

/**
 * Exports pre-initialized singleton instances.
 */
export const supabaseAdmin = getAdminClient();
export const supabasePublic = getPublicClient();

/**
 * Performs a safe health check query against Supabase without exposing credentials.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testDatabaseConnection() {
  try {
    const client = getAdminClient();
    // Perform a real GET query with limit 1 to accurately detect table existence
    const { error } = await client
      .from('members')
      .select('id')
      .limit(1);

    if (error) {
      // PGRST205 = table not in schema cache; 42P01 = undefined_table in Postgres
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return {
          ok: false,
          code: 'TABLES_NOT_FOUND',
          message: 'Connected to Supabase, but required tables were not found in the schema cache. Please execute migrations/001_initial_schema.sql in your Supabase SQL Editor.',
        };
      }
      return {
        ok: false,
        code: error.code || 'DB_ERROR',
        message: error.message,
      };
    }

    // Masked host logging for safety
    const parsedUrl = new URL(config.supabase.url);
    logger.info(`Supabase connection healthy`, { host: parsedUrl.host });
    return { ok: true, message: 'Database connection established successfully.' };
  } catch (err) {
    logger.error('Failed to connect to Supabase', { error: err.message });
    return { ok: false, code: 'CONNECTION_FAILED', message: err.message };
  }
}

