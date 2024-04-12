import { Decoder, Encoder } from "cbor-x";

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

const CBOROptions = {
  useRecords: false,
  mapsAsObjects: false,
};

export const encoder = new Encoder(CBOROptions);
export const decoder = new Decoder(CBOROptions);
