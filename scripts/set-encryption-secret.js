/* eslint-env node */
/* global console */
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';

/**
 * Generate a new 32-byte secret and upload it to the current Convex project.
 *
 * This script requires the Convex CLI to be available inside
 * `packages/backend` and will invoke `convex env set` to store the value
 * server-side.
 */

const secret = randomBytes(32).toString('base64');
console.log(`Generated secret: ${secret}`);
execSync(`cd packages/backend && npx convex env set ENCRYPTION_SECRET ${secret}`, { stdio: 'inherit' });
