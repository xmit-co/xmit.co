import "./app.css";
import Router from "preact-router";
import { Decoder, Encoder } from "cbor-x";
import { signal } from "@preact/signals";
import Sockette from "sockette";
import { Admin } from "./admin.tsx";
import { Docs } from "./docs.tsx";
import { Home } from "./home.tsx";

const CBOROptions = {
  useRecords: false,
  mapsAsObjects: false,
};
export const encoder = new Encoder(CBOROptions);

export const decoder = new Decoder(CBOROptions);

export interface State {
  ready: boolean;
  kv: Map<string, any>;
  errors: string[];
  sock?: Sockette;
}

const state = signal<State>({
  ready: false,
  kv: new Map(),
  errors: [],
});

function ingestMessage(state: State, msg: Map<number, any>): State {
  let { ready, kv, errors } = state;
  if (msg.get(1) != undefined) {
    ready = msg.get(1);
  }
  const updates = msg.get(2) as Map<string, ArrayBuffer> | undefined;
  if (updates !== undefined) {
    for (const [k, v] of updates.entries()) {
      if (v == undefined) {
        kv.delete(k);
        continue;
      }
      kv.set(k, decoder.decode(new Uint8Array(v)));
    }
  }
  const errs = msg.get(3) as Array<Map<number, string>> | undefined;
  if (errs !== undefined) {
    for (const error of errs) {
      errors.push(error.get(1)!);
    }
  }
  return { ...state, ready, kv, errors };
}

export function connect() {
  const previous = state.value.sock;
  if (previous !== undefined) {
    previous.close();
  }
  const sock = new Sockette(`wss://${window.location.host}/api/web/socket`, {
    onreconnect: () => {
      state.value = { ...state.value, ready: false, kv: new Map() };
    },
    onerror: (e) => console.log(e),
    onmessage: async (e) => {
      const msg = decoder.decode(new Uint8Array(await e.data.arrayBuffer()));
      state.value = ingestMessage(state.value, msg);
    },
  });
  state.value = { ...state.value, ready: false, kv: new Map(), sock };
}

connect();

export function disconnect() {
  const sock = state.value.sock;
  if (sock === undefined) {
    return;
  }
  console.log("disconnecting");
  sock.close();
  state.value = {
    ...state.value,
    ready: false,
    kv: new Map(),
    sock: undefined,
  };
}

export function sendUpdate(key: string, value: any) {
  const vbytes = value === undefined ? undefined : encoder.encode(value);
  const updates = new Map([[key, vbytes]]);
  const msg = new Map([[2, updates]]);
  const payload = encoder.encode(msg);
  const sock = state.value.sock;
  if (sock === undefined) {
    console.log("socket not ready");
    return;
  }
  sock.send(payload);
}

export function App() {
  return (
    <Router>
      <Home state={state.value} path="/" />
      <Admin state={state.value} path="/admin" />
      <Docs state={state.value} path="/docs" />
    </Router>
  );
}
