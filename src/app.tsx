import { signal } from "@preact/signals";
import { createContext } from "preact";
import Router, { Route } from "preact-router";
import "preact/debug";
import Sockette from "sockette";
import { Admin, TeamAdmin, UserAdmin } from "./admin.tsx";
import { Analytics, SiteAnalytics } from "./analytics.tsx";
import "./app.css";
import { Docs } from "./docs.tsx";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import { AuthRequired, Home } from "./home.tsx";
import {
  CertStatus,
  Invite,
  KeyRequest,
  Launch,
  Node,
  Site,
  State,
  Team,
  Upload,
  User,
  UserSettings,
} from "./models.tsx";
import { ProvideKey } from "./provideKey.tsx";
import { SiteAdmin } from "./siteAdmin.tsx";
import { Support, Helpdesk } from "./support.tsx";
import { decoder, encoder } from "./utils.ts";

export const reconnectChannel = new BroadcastChannel("reconnect");
new BroadcastChannel("reconnect").onmessage = connect;

const state = signal<State>({
  ready: false,
  root: {},
  errors: [],
  updates: null,
});

const userMapping = {
  id: 1,
  name: 2,
  teams: 3,
  apiKeys: 4,
  webKeys: 5,
  phone: 6,
  email: 7,
};

const credInfoMapping = {
  name: 1,
  createdAt: 2,
  createdBy: 3,
};

const teamMapping = {
  id: 1,
  name: 2,
  sites: 3,
  users: 4,
  apiKeys: 5,
  defaultSettings: 6,
  invites: 7,
};

const inviteMapping = {
  id: 1,
  teamID: 2,
  createdAt: 3,
  creatingUserID: 4,
};

const siteMapping = {
  id: 1,
  teamID: 2,
  name: 3,
  settings: 4,
  domains: 5,
  uploads: 6,
  launches: 7,
};

const settingsMapping = {
  publishInstantly: 1,
  password: 2,
};

const uploadMapping = {
  id: 1,
  bundle: 2,
  at: 3,
  by: 4,
  siteID: 5,
};

const launchMapping = {
  id: 1,
  uploadID: 2,
  at: 3,
  by: 4,
  siteID: 5,
};

const keyRequestMapping = {
  id: 1,
  createdAt: 2,
  key: 3,
  name: 4,
};

const certStatusMapping = {
  failures: 1,
  lastFail: 2,
  lastErr: 3,
  paused: 4,
};

const domainMapping = {
  cert: 5,
};

const analyticsViewMapping = {
  name: 1,
  range: 2,
  granularity: 3,
  groupBy: 4,
  filters: 5,
  limit: 6,
  stacked: 7,
  sortByCount: 8,
};

const userSettingsMapping = {
  analyticsViews: 1,
};

const ticketMapping = {
  id: 1,
  teamId: 2,
  title: 3,
  createdAt: 4,
  updatedAt: 5,
  status: 6,
  messageCount: 7,
  createdBy: 8,
};

const openTicketsMapping = {
  tickets: 1,
};

export const StateCtx = createContext(state);

function loadKey(node: Node, key: any) {
  if (!Array.isArray(key)) {
    key = [key];
  }
  if (key.length === 0) {
    return node.value;
  }
  const [head, ...tail] = key;
  const child = node.children?.get(head);
  if (child === undefined) {
    return undefined;
  }
  return loadKey(child, tail);
}

function map(
  v: Map<any, any>,
  mapping: Record<string, number>,
): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, i] of Object.entries(mapping)) {
    r[k] = v.get(i);
  }
  return r;
}

export interface Session {
  uid: number;
  createdAPIKeys: Map<Uint8Array, string>;
  isSupport: boolean;
}

export function loadSession(state: State) {
  return loadKey(state.root, "S") as Session | undefined;
}

export function loadUser(state: State, id: number | undefined) {
  return loadKey(state.root, ["u", id || 0]) as User | undefined;
}

export function loadUserSettings(state: State) {
  return loadKey(state.root, "U") as UserSettings | undefined;
}

export function loadTeam(state: State, id: number | undefined) {
  return loadKey(state.root, ["t", id || 0]) as Team | undefined;
}

export function loadInvite(state: State, id: string) {
  return loadKey(state.root, ["i", id]) as Invite | undefined;
}

export function loadSite(state: State, id: number) {
  return loadKey(state.root, ["s", id || 0]) as Site | undefined;
}

export function loadUpload(
  state: State,
  siteID: number | undefined,
  id: number | undefined,
) {
  return loadKey(state.root, ["s", siteID || 0, "u", id || 0]) as
    | Upload
    | undefined;
}

export function loadLaunch(
  state: State,
  siteID: number | undefined,
  id: number | undefined,
) {
  return loadKey(state.root, ["s", siteID || 0, "l", id || 0]) as
    | Launch
    | undefined;
}

export function loadKeyRequest(state: State, id: string) {
  return loadKey(state.root, ["r", id]) as KeyRequest | undefined;
}

// Ticket status enum (matches backend TicketStatus)
export const TicketStatus = {
  AwaitingCustomer: 0,
  AwaitingSupport: 1,
  Closed: 2,
} as const;

export interface Ticket {
  id: number;
  teamId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  status: number;
  messageCount: number;
  createdBy: number;
}

export interface TicketMessageRef {
  id: number;
  ticketId: number;
  userId: number;
  isAdmin: boolean;
  contentHash: Uint8Array;
  createdAt: Date;
}

export function loadTicket(state: State, id: number) {
  return loadKey(state.root, ["T", id || 0]) as Ticket | undefined;
}

export function loadTicketMessageRef(state: State, ticketId: number, messageId: number) {
  return loadKey(state.root, ["T", ticketId || 0, "m", messageId || 0]) as TicketMessageRef | undefined;
}

export function loadAllOpenTickets(state: State): Ticket[] {
  const openTickets = loadKey(state.root, ["T", "open"]) as { tickets: Map<number, object> } | undefined;
  if (!openTickets?.tickets) return [];

  const tickets: Ticket[] = [];
  for (const ticketID of openTickets.tickets.keys()) {
    const ticket = loadTicket(state, ticketID);
    if (ticket) {
      tickets.push(ticket);
    }
  }
  return tickets;
}

export function loadTeamTickets(state: State, teamIds: number[]): Ticket[] {
  // Get the "T" node
  const tNode = state.root.children?.get("T");
  if (!tNode?.children) return [];

  const tickets: Ticket[] = [];
  for (const [key] of tNode.children) {
    // Skip non-numeric keys like "open"
    if (typeof key !== "number") continue;
    const ticket = loadTicket(state, key);
    if (ticket && teamIds.includes(ticket.teamId)) {
      tickets.push(ticket);
    }
  }
  return tickets;
}

export function countTicketsAwaitingCustomer(state: State): number {
  const tickets = loadAllOpenTickets(state);
  return tickets.filter(t => (t.status ?? TicketStatus.AwaitingCustomer) === TicketStatus.AwaitingCustomer).length;
}

export function countTicketsAwaitingSupport(state: State): number {
  const tickets = loadAllOpenTickets(state);
  return tickets.filter(t => t.status === TicketStatus.AwaitingSupport).length;
}

export function countTeamTicketsAwaitingCustomer(state: State, teamIds: number[]): number {
  const tickets = loadTeamTickets(state, teamIds);
  return tickets.filter(t => (t.status ?? TicketStatus.AwaitingCustomer) === TicketStatus.AwaitingCustomer).length;
}

export interface DomainInfo {
  cert: CertStatus | undefined;
}

export function loadDomain(state: State, domain: string) {
  return loadKey(state.root, ["d", domain]) as DomainInfo | undefined;
}

function ingestMessage(state: State, msg: Map<number, any>): State {
  let { ready, root, errors } = state;
  if (msg.get(1) != undefined) {
    ready = msg.get(1);
  }
  const updates = msg.get(2) as [[any, any]] | undefined;

  function transform(value: any, key: any) {
    if (!Array.isArray(key)) {
      key = [key];
    }
    switch (key.length) {
      case 1:
        if (key[0] === "S") {
          return map(value, {
            uid: 1,
            createdAPIKeys: 2,
            isSupport: 4,
          });
        }
        if (key[0] === "U") {
          const us = map(value, userSettingsMapping);
          if (us.analyticsViews) {
            us.analyticsViews = new Map(
              Array.from(us.analyticsViews, ([k, v]) => [
                k,
                map(v, analyticsViewMapping),
              ]),
            );
          }
          return us;
        }
        break;
      case 2:
        switch (key[0]) {
          case "u":
            const u = map(value, userMapping);
            if (u.apiKeys) {
              u.apiKeys = new Map(
                Array.from(u.apiKeys, ([k, v]) => [k, map(v, credInfoMapping)]),
              );
            }
            if (u.webKeys) {
              u.webKeys = new Map(
                Array.from(u.webKeys, ([k, v]) => [k, map(v, credInfoMapping)]),
              );
            }
            return u;
          case "t":
            const t = map(value, teamMapping);
            if (t.apiKeys) {
              t.apiKeys = new Map(
                Array.from(t.apiKeys, ([k, v]) => [k, map(v, credInfoMapping)]),
              );
            }
            if (t.defaultSettings) {
              t.defaultSettings = map(t.defaultSettings, settingsMapping);
            }
            return t;
          case "i":
            return map(value, inviteMapping);
          case "r":
            return map(value, keyRequestMapping);
          case "s":
            const s = map(value, siteMapping);
            if (s.settings) {
              s.settings = map(s.settings, settingsMapping);
            }
            return s;
          case "d":
            const d = map(value, domainMapping);
            if (d.cert) {
              d.cert = map(d.cert, certStatusMapping);
            }
            return d;
          case "T":
            if (key[1] === "open") {
              return map(value, openTicketsMapping);
            }
            return map(value, ticketMapping);
        }
        break;
      case 4:
        switch (key[0]) {
          case "s":
            switch (key[2]) {
              case "u":
                return map(value, uploadMapping);
              case "l":
                return map(value, launchMapping);
            }
        }
    }
    return value;
  }

  function setKey(node: Node, k: any, v: any) {
    if (!Array.isArray(k)) {
      k = [k];
    }
    if (k.length === 0) {
      node.value = v;
      return;
    }
    const [head, ...tail] = k;
    let child = node.children?.get(head);
    if (child === undefined) {
      child = {};
      if (node.children === undefined) {
        node.children = new Map();
      }
      node.children.set(head, child);
    }
    setKey(child, tail, v);
  }

  function deleteKey(node: Node, k: any) {
    if (!Array.isArray(k)) {
      k = [k];
    }
    if (k.length === 0) {
      delete node.value;
      return;
    }
    const [head, ...tail] = k;
    const child = node.children?.get(head);
    if (child === undefined) {
      return;
    }
    deleteKey(child, tail);
  }

  const debug = state.updates !== null;

  if (updates !== undefined) {
    for (const [str, v] of updates.values()) {
      const k = decoder.decode(str);
      if (v === undefined || v === null) {
        deleteKey(root, k);
        if (debug) {
          state.updates!.push([k, undefined]);
        }
      } else {
        const value = transform(decoder.decode(v), k);
        setKey(root, k, value);
        if (debug) {
          state.updates!.push([k, [value]]);
        }
      }
    }
  }
  const errs = msg.get(3) as Array<Map<number, string>> | undefined;
  if (errs !== undefined) {
    for (const error of errs) {
      errors.push(error.get(1)!);
    }
  }
  return { ...state, ready, root, errors };
}

function connect() {
  const previous = state.value.sock;
  if (previous !== undefined) {
    previous.close();
  }
  const sock = new Sockette(`wss://${window.location.host}/api/web/socket`, {
    onerror: () => {
      state.value = { ...state.value, ready: false };
    },
    onmessage: async (e) => {
      const msg = decoder.decode(new Uint8Array(await e.data.arrayBuffer())) as Map<number, any>;
      state.value = ingestMessage(state.value, msg);
    },
  });
  state.value = { ...state.value, ready: false, root: {}, sock };
}

connect();

export function logError(msg: string | Error) {
  if (msg instanceof Error) {
    msg = msg.message;
  }
  const errors = [...state.value.errors];
  errors.push(msg);
  state.value = { ...state.value, errors };
}

export function sendUpdate(key: any, value?: any) {
  const msg = new Map([
    [
      2,
      [
        [
          encoder.encode(key),
          value === undefined ? undefined : encoder.encode(value),
        ],
      ],
    ],
  ]);
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
      class="clickable"
      onClick={() =>
        (state.value = { ...state.value, errors: errors.toSpliced(idx, 1) })
      }
    >
      {e} ⨉
    </div>
  ));
  return <div class="errors">{elems}</div>;
}

function replacer(_: any, v: any) {
  if (v instanceof Map) {
    return ["Map", Array.from(v.entries())];
  }
  if (v instanceof Uint8Array) {
    return `u8[${btoa(String.fromCharCode.apply(null, Array.from(v)))}]`;
  }
  return v;
}

function NodeInspector({ node }: { node: Node }) {
  return (
    <dl class="inspector">
      {node.value ? (
        <>
          <dt>value</dt>
          <dd>
            <pre>{JSON.stringify(node.value, replacer, 2)}</pre>
          </dd>
        </>
      ) : undefined}
      {Array.from(node.children || []).map(([k, v]) => (
        <>
          <dt>
            <pre>{JSON.stringify(k)}</pre>
          </dt>
          <dd>
            <NodeInspector node={v} />
          </dd>
        </>
      ))}
    </dl>
  );
}

function UpdatesInspector({ updates }: { updates: [any, any][] | null }) {
  if (updates === null) {
    return <></>;
  }
  return (
    <dl class="inspector">
      {updates.map(([k, v]) => (
        <>
          <dt>
            <pre>{JSON.stringify(k)}</pre>
          </dt>
          <dd>
            <pre>{JSON.stringify(v, replacer)}</pre>
          </dd>
        </>
      ))}
    </dl>
  );
}

function Debug() {
  if (state.value.updates === null) {
    state.value = { ...state.value, updates: [] };
  }
  return (
    <div class="with-header">
      <Header session={loadSession(state.value)} />
      <h2>State</h2>
      <NodeInspector node={state.value.root} />
      <h2>Updates</h2>
      <UpdatesInspector updates={state.value.updates} />
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <StateCtx.Provider value={state}>
      <Errors />
      <Router>
        <Route path="/" component={Home} />
        <Route path="/signin/:url" component={AuthRequired} />
        <Route path="/docs" component={Docs} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/user" component={UserAdmin} />
        <Route path="/admin/team/:id" component={TeamAdmin} />
        <Route path="/admin/site/:id" component={SiteAdmin} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/analytics/site/:id" component={SiteAnalytics} />
        <Route path="/support" component={Support} />
        <Route path="/support/:id" component={Support} />
        <Route path="/helpdesk" component={Helpdesk} />
        <Route path="/helpdesk/:id" component={Helpdesk} />
        <Route path="/provide-key/:id" component={ProvideKey} />
        <Route path="/debug" component={Debug} />
      </Router>
    </StateCtx.Provider>
  );
}
