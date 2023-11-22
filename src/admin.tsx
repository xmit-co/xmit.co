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

function EditableText({
  value,
  placeholder,
  submit,
  whenMissing,
  autocomplete,
}: {
  class?: string | undefined;
  value: string | undefined;
  whenMissing?: string | undefined;
  placeholder?: string | undefined;
  autocomplete?: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autocomplete={autocomplete}
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
    <>
      {value || <em>{whenMissing}</em>}{" "}
      <button onClick={() => setEditing(true)}>✎</button>
    </>
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
      <div class="section">
        <div class="ssections">
          <h2>
            <span class="icon">👤</span>#{uid}:{" "}
            <EditableText
              value={user?.name}
              whenMissing="Anonymous"
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
            <div>
              <em>None yet.</em>
            </div>
          </div>
          <div>
            <h3>
              <span class="icon">🔑</span>API keys{" "}
              <button onClick={() => sendUpdate(["u", uid, "k"])}>+</button>
            </h3>
            <div>
              <em>None yet.</em>
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
                autocomplete="tel"
                submit={(v) => sendUpdate(["u", uid], new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user?.email}
                whenMissing="No E-mail"
                placeholder="Email"
                autocomplete="email"
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
      <div>
        Admin interface incoming 😅 Check out our{" "}
        <a href="https://demo.xmit.co/landed.html">prototype</a>.
      </div>
    </>
  );
}

export function Admin() {
  const state = useContext(StateCtx);
  const session = loadSession(state.value);
  const uid = session?.uid;
  if (uid === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="body">
        {state.value.ready ? (
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
