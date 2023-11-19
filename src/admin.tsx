import { Header } from "./header.tsx";
import { state } from "./app.tsx";
import { route } from "preact-router";

export function Admin({}: { path: string }) {
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
