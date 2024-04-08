import { Header } from "./header.tsx";
import {
  loadSession,
  loadTeam,
  loadUser,
  logError,
  sendUpdate,
  Session,
  State,
  StateCtx,
} from "./app.tsx";
import { route } from "preact-router";
import { useContext, useEffect, useState } from "preact/hooks";
import { enroll } from "./webauthn.tsx";
import { Footer } from "./footer.tsx";

function EditableText({
  value,
  placeholder,
  submit,
  whenMissing,
  type,
}: {
  class?: string | undefined;
  value: string | undefined;
  whenMissing?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [value]);
  if (editing) {
    return (
      <input
        type={type || "text"}
        value={value}
        placeholder={placeholder}
        ref={(e) => e && e.focus()}
        onfocusin={(e) => (e.target as HTMLInputElement).select()}
        onfocusout={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value;
            if (v == value) {
              setEditing(false);
            } else {
              submit(v);
            }
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        onInput={(e) => {
          const t = e.target as HTMLInputElement;
          t.style.width = `max(10em, ${t.value.length}ch)`;
        }}
      />
    );
  }
  return (
    <span class="clickable" onClick={() => setEditing(true)}>
      {value || <em>{whenMissing}</em>}
      <button>✎</button>
    </span>
  );
}

function JoinTeam() {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="password"
        placeholder="Invite code"
        ref={(e) => e && e.focus()}
        onfocusout={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value;
            if (v !== "") sendUpdate("j", v);
            setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button class="add" onClick={() => setEditing(true)}>
      ⨝ join a team
    </button>
  );
}

export interface CredInfo {
  name: string;
  createdAt: number;
}

export interface User {
  id: number;
  name: string | undefined;
  teams: Map<number, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  webKeys: Map<string, CredInfo> | undefined;
  phone: string | undefined;
  email: string | undefined;
}

export interface Team {
  id: number;
  name: string | undefined;
  sites: Map<string, undefined> | undefined;
  users: Map<number, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  defaultSettings: Record<string, any> | undefined;
}

function WebKey({ id, info }: { id: string; info: CredInfo }) {
  return (
    <div>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        submit={(v) => sendUpdate(["p", id], new Map([[1, v]]))}
      />
      <button class="delete" onClick={() => sendUpdate(["p", id])}>
        ✕
      </button>
      <br />
      created {new Date(info.createdAt * 1000).toISOString()}
    </div>
  );
}

function APIKey({
  id,
  info,
  raw,
}: {
  id: Uint8Array;
  info: CredInfo;
  raw: string | undefined;
}) {
  return (
    <div>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        submit={(v) => sendUpdate(["k", id], new Map([[1, v]]))}
      />
      {raw ? (
        <button onClick={() => navigator.clipboard.writeText(raw)}>📋</button>
      ) : null}
      <button class="delete" onClick={() => sendUpdate(["k", id])}>
        ✕
      </button>
      <br />
      created {new Date(info.createdAt * 1000).toISOString()}
    </div>
  );
}

function Team({ id, state }: { id: any; state: State }) {
  const team = loadTeam(state, id);
  if (team === undefined) {
    return <></>;
  }
  return (
    <div class="section">
      <h2>
        <span className="icon">🏭</span>#{team.id}:{" "}
        <EditableText
          type="text"
          value={team.name}
          whenMissing="unnamed"
          submit={(v) => sendUpdate(["t", id], new Map([[2, v]]))}
        />
      </h2>
    </div>
  );
}

function AdminBody({ session, state }: { session: Session; state: State }) {
  const uid = session.uid;
  const user = loadUser(state, uid);
  return (
    <>
      <p>
        Little is implemented. See{" "}
        <a href="https://demo.xmit.co/landed.html">
          a static but larger preview
        </a>
        .
      </p>
      <div class="section">
        <div class="ssections">
          <h2>
            <span class="icon">👤</span>#{uid}:{" "}
            <EditableText
              type="text"
              value={user?.name}
              whenMissing="anonymous"
              submit={(v) => sendUpdate("u", new Map([[2, v]]))}
            />
          </h2>
        </div>
        <div class="ssections">
          <div>
            <h3>
              <span class="icon">🔐</span>Web passkeys{" "}
              <button class="add" onClick={() => enroll().catch(logError)}>
                +
              </button>
            </h3>
            {Array.from(user?.webKeys?.entries() || []).map(([id, info]) => (
              <WebKey id={id} info={info} />
            ))}
          </div>
          <div>
            <h3>
              <span class="icon">🔑</span>API keys{" "}
              <button class="add" onClick={() => sendUpdate("k")}>
                +
              </button>
            </h3>
            {Array.from(user?.apiKeys?.entries() || []).map(([id, info]) => (
              <APIKey
                id={id}
                info={info}
                // TODO: complexity isnt' great here, would be much better to index keys by hash
                raw={
                  [...(session.createdAPIKeys?.entries() || [])].find(
                    ([k, _]) => k.every((v, i) => id[i] === v),
                  )?.[1]
                }
              />
            ))}
          </div>
          <div>
            <h3>
              <span class="icon">📇</span>Contact
            </h3>
            <div>
              If we <em>need</em> to reach out?
              <br />
              <EditableText
                value={user?.phone}
                whenMissing="No phone #"
                placeholder="Phone #"
                type="tel"
                submit={(v) => sendUpdate("u", new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user?.email}
                whenMissing="No E-mail"
                placeholder="Email"
                type="email"
                submit={(v) => sendUpdate("u", new Map([[7, v]]))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button class="add" onClick={() => sendUpdate("j")}>
          + new team
        </button>
        <JoinTeam />
      </div>
      {[...(user?.teams?.keys() || [])].map((id) => (
        <Team id={id} state={state} />
      ))}
      <Footer />
    </>
  );
}

export function Admin() {
  const state = useContext(StateCtx);
  const ready = state.value.ready;
  const session = loadSession(state.value);
  const uid = session?.uid;
  if (ready && uid === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="body">
        {ready && session !== undefined ? (
          <AdminBody session={session} state={state.value} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <em>Loading…</em>
          </div>
        )}
      </div>
    </div>
  );
}
