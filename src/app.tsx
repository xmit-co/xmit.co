import "./app.css";
import Router, { Route } from "preact-router";
import { Decoder, Encoder } from "cbor-x";
import { signal } from "@preact/signals";
import Sockette from "sockette";
import { Admin } from "./admin.tsx";
import { Docs } from "./docs.tsx";
import { Home } from "./home.tsx";
import { createContext } from "preact";

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

export const StateCtx = createContext(state);

export function load(
  state: State,
  key: any,
  mapping: Record<string, number>,
): Record<string, any> | undefined {
  const v = state.kv.get(JSON.stringify(key));
  if (v === undefined || v === null) {
    return undefined;
  }
  const r: Record<string, any> = {};
  for (const [k, i] of Object.entries(mapping)) {
    r[k] = v.get(i);
  }
  return r;
}

export interface Session {
  uid: number;
}

export function loadSession(state: State) {
  return load(state, "s", { uid: 1 }) as Session | undefined;
}

function ingestMessage(state: State, msg: Map<number, any>): State {
  let { ready, kv, errors } = state;
  if (msg.get(1) != undefined) {
    ready = msg.get(1);
  }
  const updates = msg.get(2) as [[any, any]] | undefined;
  if (updates !== undefined) {
    for (const [k, v] of updates.values()) {
      if (v === undefined || v === null) {
        kv.delete(JSON.stringify(k));
        continue;
      }
      kv.set(JSON.stringify(k), decoder.decode(v));
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
    onerror: () => {
      state.value = { ...state.value, ready: false };
    },
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
  sock.close();
  state.value = {
    ...state.value,
    ready: false,
    kv: new Map(),
    sock: undefined,
  };
}

export function logError(msg: string | Error) {
  if (msg instanceof Error) {
    msg = msg.message;
  }
  const errors = [...state.value.errors];
  errors.push(msg);
  state.value = { ...state.value, errors };
}

export function sendUpdate(key: any, value?: any) {
  const msg = new Map([[2, [[key, encoder.encode(value)]]]]);
  const payload = encoder.encode(msg);
  const sock = state.value.sock;
  if (sock === undefined) {
    logError("Socket not connected");
    return;
  }
  sock.send(payload);
}

function Errors() {
  const errors = state.value.errors;
  if (errors.length == 0) {
    return <></>;
  }
  const elems = errors.map((e, idx) => (
    <div
      onClick={() =>
        (state.value = { ...state.value, errors: errors.toSpliced(idx, 1) })
      }
    >
      {e}
    </div>
  ));
  return <div class="errors">{elems}</div>;
}

export function App() {
  return (
    <StateCtx.Provider value={state}>
      <Errors />
      <Router>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route path="/docs" component={Docs} />
      </Router>
    </StateCtx.Provider>
  );
}
