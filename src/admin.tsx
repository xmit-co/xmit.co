import { Header } from "./header.tsx";
import { StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { useContext } from "preact/hooks";

export function Admin() {
  const state = useContext(StateCtx);
  const session = state.value.kv.get("session");
  if (session === undefined || session.get(1) === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header />
      <div class="body">{session.get(1)}</div>
    </div>
  );
}
