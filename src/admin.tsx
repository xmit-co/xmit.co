import { Header } from "./header.tsx";
import { State } from "./app.tsx";
import { route } from "preact-router";

export function Admin({ state }: { state: State; path: string }) {
  const session = state.kv.get("session");
  if (session === undefined || session.get(1) === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header state={state} />
      <div class="body">{session.get(1)}</div>
    </div>
  );
}
