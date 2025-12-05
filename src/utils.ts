import { decode, encode } from "cbor2";

export function u8eq(
  a: Uint8Array | undefined,
  b: Uint8Array | undefined,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.length !== b.length) {
    return false;
  }
  return b.every((v, i) => a[i] === v);
}

export const encoder = { encode: (v: unknown) => encode(v) };
export const decoder = {
  decode: (v: Uint8Array) => decode(v, { preferMap: true }),
};
