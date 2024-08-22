import { reconnectChannel } from "./app.tsx";
import { encoder } from "./utils.ts";

export async function enroll() {
  const userName = `From ${new Date().toISOString().replace(/\....Z$/, "Z")}`;
  const userID = new TextEncoder().encode(userName);

  const creds = (await navigator.credentials.create({
    publicKey: {
      challenge: new Uint8Array(16),
      rp: {
        name: window.location.hostname,
        id: window.location.hostname,
      },
      user: {
        id: userID,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
    },
  })) as PublicKeyCredential | null;
  if (creds === null) {
    window.alert("could not create credentials");
    return;
  }
  const id = creds.id;
  const response = creds.response as AuthenticatorAttestationResponse;
  const attestationObject = response.attestationObject;
  const resp = await fetch("/api/web/authn/enroll", {
    method: "POST",
    body: encoder.encode(
      new Map<number, any>([
        [1, id],
        [2, attestationObject],
      ])
    ),
  });
  if (resp.status != 200) {
    const body = await resp.text();
    throw new Error(`Could not enroll: ${body}`);
  }
}

export async function signin() {
  const challengeResp = await fetch("/api/web/authn/challenge");
  if (challengeResp.status != 200) {
    window.alert(`Could not get challenge: ${challengeResp.statusText}`);
    return;
  }
  const challenge = await challengeResp.arrayBuffer();
  const creds = (await navigator.credentials.get({
    publicKey: {
      rpId: window.location.hostname,
      challenge,
    },
  })) as PublicKeyCredential | null;
  if (creds == null) {
    throw new Error("Could not get credentials");
  }
  const id = creds.id;
  const response = creds.response as AuthenticatorAssertionResponse;
  const clientDataJSON = response.clientDataJSON;
  const authenticatorData = response.authenticatorData;
  const signature = response.signature;
  const resp = await fetch("/api/web/authn/signin", {
    method: "POST",
    body: encoder.encode(
      new Map<number, any>([
        [1, id],
        [2, clientDataJSON],
        [3, authenticatorData],
        [4, signature],
      ])
    ),
  });
  if (resp.status != 200) {
    const body = await resp.text();
    throw new Error(`Could not sign in: ${body}`);
  }
  reconnectChannel.postMessage(undefined);
}

export async function signout() {
  const resp = await fetch("/api/web/authn/signout");
  if (resp.status != 200) {
    const body = await resp.text();
    throw new Error(`Could not sign out: ${body}`);
  }
  reconnectChannel.postMessage(undefined);
}
