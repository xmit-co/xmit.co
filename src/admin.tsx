import { Header } from "./header.tsx";
import { sendUpdate, State, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { useContext, useState } from "preact/hooks";

function EditableText({
  value,
  submit,
}: {
  value: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="text"
        value={value}
        autofocus={true}
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
      {value} <button onClick={() => setEditing(true)}>✎</button>
    </>
  );
}

function AdminBody({ state }: { state: State }) {
  const session = state.kv.get("session");
  const uid = session.get(1);
  const user = state.kv.get(`/u/${uid}`) || {
    get: (k: number) => `field ${k}`,
  };
  return (
    <>
      <div class="section">
        <h2>
          👤 #{uid}:{" "}
          <EditableText
            value={user.get(2)}
            submit={(v) => sendUpdate(`/u/${uid}`, new Map([[2, v]]))}
          />
        </h2>
      </div>
      Admin interface incoming 😅 Check out our{" "}
      <a href="https://demo.xmit.co/landed.html">prototype</a>.
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
