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
    onerror: (e) => {
      state.value = { ...state.value, ready: false };
      console.log(e);
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

export function sendUpdate(key: string, value?: any) {
  const vbytes = value === undefined ? undefined : encoder.encode(value);
  const updates = new Map([[key, vbytes]]);
  const msg = new Map([[2, updates]]);
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
