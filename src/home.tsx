import { connect, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { enroll, signin } from "./webauthn.tsx";
import { useContext } from "preact/hooks";

export function Home({}: { path: string }) {
  const state = useContext(StateCtx);
  const session = state.value.kv.get("session");
  if (session !== undefined && session.get(1) !== undefined) {
    route("/admin");
    return <></>;
  }

  return (
    <div class="home">
      <h1>🛰 xmit — launch fast</h1>
      <p>
        <button onClick={() => route("/docs")}>📚 docs</button>
        <button onClick={() => enroll().then(connect).catch(console.log)}>
          🤗 first time
        </button>
        <button onClick={() => signin().then(connect).catch(console.log)}>
          🧐 returning
        </button>
      </p>
    </div>
  );
}
