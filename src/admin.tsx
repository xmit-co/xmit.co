import { Header } from "./header.tsx";
import {
  load,
  loadSession,
  logError,
  sendUpdate,
  Session,
  State,
  StateCtx,
} from "./app.tsx";
import { route } from "preact-router";
import { useContext, useState } from "preact/hooks";
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
        type="text"
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
  return <button onClick={() => setEditing(true)}>⨝ join a team</button>;
}

interface User {
  id: number;
  name: string | undefined;
  teams: Map<number, undefined> | undefined;
  apiKeys: Map<string, Map<number, any>> | undefined;
  webKeys: Map<string, Map<number, any>> | undefined;
  phone: string | undefined;
  email: string | undefined;
}

function WebKey({ raw, attrs }: { raw: string; attrs: Map<number, any> }) {
  const name = attrs.get(1) as string;
  const created = attrs.get(2) as Date;
  return (
    <div>
      <EditableText
        value={name}
        placeholder="Name"
        whenMissing="unnamed"
        submit={(v) => sendUpdate(["k", raw], new Map([[1, v]]))}
      />
      <button class="delete" onClick={() => sendUpdate(["k", raw])}>
        ✕
      </button>
      <br />
      created {created.toISOString()}
    </div>
  );
}

function AdminBody({
  session,
  state,
}: {
  session?: Session | undefined;
  state: State;
}) {
  const uid = session?.uid;
  const user = load(state, ["u", uid], {
    id: 1,
    name: 2,
    teams: 3,
    apiKeys: 4,
    webKeys: 5,
    phone: 6,
    email: 7,
  }) as User | undefined;
  return (
    <>
      <p>
        Not functional yet. See{" "}
        <a href="https://demo.xmit.co/landed.html">a fuller preview</a>.
      </p>
      <div class="section">
        <div class="ssections">
          <h2>
            <span class="icon">👤</span>#{uid}:{" "}
            <EditableText
              type="text"
              value={user?.name}
              whenMissing="anonymous"
              submit={(v) => sendUpdate(["u", uid], new Map([[2, v]]))}
            />
          </h2>
        </div>
        <div class="ssections">
          <div>
            <h3>
              <span class="icon">🔐</span>Web passkeys{" "}
              <button onClick={() => enroll().catch(logError)}>+</button>
            </h3>
            {Array.from(user?.webKeys?.entries() || []).map(([raw, attrs]) => (
              <WebKey raw={raw} attrs={attrs} />
            ))}
          </div>
          <div>
            <h3>
              <span class="icon">🔑</span>API keys{" "}
              <button onClick={() => sendUpdate(["u", uid, "k"])}>+</button>
            </h3>
            <div>
              <em>None.</em>
            </div>
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
                submit={(v) => sendUpdate(["u", uid], new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user?.email}
                whenMissing="No E-mail"
                placeholder="Email"
                type="email"
                submit={(v) => sendUpdate(["u", uid], new Map([[7, v]]))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => sendUpdate("j")}>+ new team</button>
        <JoinTeam />
      </div>
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
        {ready ? (
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
