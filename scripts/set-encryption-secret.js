/* eslint-env node */
/* global console */
import { execSync } from 'child_process';
import { generateSecret, exportJWK } from 'jose';

/**
 * Generate a new 32-byte secret and upload it to the current Convex project.
 *
 * This script requires the Convex CLI to be available inside
 * `packages/backend` and will invoke `convex env set` to store the value
 * server-side.
 */

const key = await generateSecret('A256GCM');
const { k } = await exportJWK(key);
if (!k) {
  throw new Error('Failed to export secret');
}
console.log(`Generated secret: ${k}`);
execSync(`cd packages/backend && npx convex env set ENCRYPTION_SECRET ${k}`, {
  stdio: 'inherit',
});
