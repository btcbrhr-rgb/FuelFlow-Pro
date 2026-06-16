/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates the next sequential ID with a prefix and padded sequence number.
 * It ignores legacy timestamp-based IDs (detected by being above 1,000,000) 
 * to ensure sequence starts clean from 0001 or 01.
 */
export function generateNextId(prefix: string, existingIds: string[], padLength: number = 4): string {
  let maxNum = 0;
  const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Match prefix and digits exactly
  const regex = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');

  existingIds.forEach((id) => {
    if (!id) return;
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      // Ignore huge timestamp-based IDs or random codes
      if (!isNaN(num) && num < 1000000 && num > maxNum) {
        maxNum = num;
      }
    } else {
      // Fallback: search for trailing digits in standard formats
      const trailMatch = id.match(/(\d+)$/);
      if (trailMatch) {
        const num = parseInt(trailMatch[1], 10);
        if (!isNaN(num) && num < 1000000 && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(padLength, '0')}`;
}
