import { connect, logError, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { enroll, signin } from "./webauthn.tsx";
import { useContext } from "preact/hooks";

export function Home() {
  const state = useContext(StateCtx);
  const session = state.value.kv.get("session");

  if (session !== undefined && session.get(1) !== undefined) {
    route("/admin");
    return <></>;
  }
  const mark = state.value.ready ? "🔴" : "🟡";

  return (
    <div class="home">
      <h1>
        🛰 xmit — launch fast <span class="mark"> {mark}</span>
      </h1>
      <div>
        <button onClick={() => route("/docs")}>📚 docs</button>
        <button onClick={() => enroll().then(connect).catch(logError)}>
          🤗 first time
        </button>
        <button onClick={() => signin().then(connect).catch(logError)}>
          🧐 returning
        </button>
      </div>
    </div>
  );
}
