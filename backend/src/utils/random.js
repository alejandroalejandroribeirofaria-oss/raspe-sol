import crypto from 'node:crypto';

export function secureInt(maxExclusive) {
  return crypto.randomInt(0, maxExclusive);
}

export function pickUniquePositions(total, count) {
  const selected = new Set();
  while (selected.size < count) {
    selected.add(secureInt(total));
  }
  return [...selected];
}

export function randomItem(items) {
  return items[secureInt(items.length)];
}

