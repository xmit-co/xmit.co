import { Header } from "./header.tsx";
import { connect, logError, sendUpdate, State, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { useContext, useState } from "preact/hooks";
import { enroll } from "./webauthn.tsx";

function EditableText({
  value,
  placeholder,
  submit,
  whenMissing,
}: {
  value: string | undefined;
  whenMissing?: string | undefined;
  placeholder?: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="text"
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
            sendUpdate("joinTeam", v);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }
  return <button onClick={() => setEditing(true)}>⨝ join a team</button>;
}

function AdminBody({ state }: { state: State }) {
  const session = state.kv.get("session");
  const uid = session.get(1);
  const user = state.kv.get(`/u/${uid}`) || { get: () => undefined };
  return (
    <>
      <div class="section">
        <h2>
          👤 #{uid}:{" "}
          <EditableText
            value={user.get(2)}
            whenMissing="Anonymous"
            submit={(v) => sendUpdate(`/u/${uid}`, new Map([[2, v]]))}
          />
        </h2>
        <div class="ssections">
          <div>
            <h3>
              🔐 Web passkeys{" "}
              <button onClick={() => enroll().then(connect).catch(logError)}>
                +
              </button>
            </h3>
          </div>
          <div>
            <h3>
              🔑 API keys{" "}
              <button onClick={() => sendUpdate(`/u/${uid}/k`)}>+</button>
            </h3>
          </div>
          <div>
            <h3>📇 Contact</h3>
            <div>
              If we <em>need</em> to reach out?
              <br />
              <EditableText
                value={user.get(6)}
                whenMissing="No phone #"
                placeholder="Phone #"
                submit={(v) => sendUpdate(`/u/${uid}`, new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user.get(7)}
                whenMissing="No E-mail"
                placeholder="Email"
                submit={(v) => sendUpdate(`/u/${uid}`, new Map([[7, v]]))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => sendUpdate("createTeam")}>+ new team</button>
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
  const session = state.value.kv.get("session");
  let ready = state.value.ready;
  if (ready && (session === undefined || session.get(1) === undefined)) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header />
      <div class="body">
        {ready ? <AdminBody state={state.value} /> : <em>Initializing…</em>}
      </div>
    </div>
  );
}
