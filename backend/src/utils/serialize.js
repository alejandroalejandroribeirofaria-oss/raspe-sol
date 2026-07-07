export function serializeBigInt(value) {
  return JSON.parse(JSON.stringify(value, (_, v) => (
    typeof v === 'bigint' ? v.toString() : v
  )));
}

export function lamportsToSolString(lamports) {
  const value = BigInt(lamports ?? 0);
  const whole = value / 1_000_000_000n;
  const fraction = (value % 1_000_000_000n).toString().padStart(9, '0');
  return `${whole}.${fraction}`.replace(/\.?0+$/, '');
}

