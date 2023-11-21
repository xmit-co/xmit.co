import { Header } from "./header.tsx";
import { State, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { useContext } from "preact/hooks";

function AdminBody({ state }: { state: State }) {
  return (
    <>
      User #{state.kv.get("session").get(1)}. Admin interface incoming 😅 Check
      out our <a href="https://demo.xmit.co/landed.html">prototype</a>.
    </>
  );
}

export function Admin() {
  const state = useContext(StateCtx);
  const session = state.value.kv.get("session");
  let lockedAndLoaded = true;
  if (session === undefined || session.get(1) === undefined) {
    if (state.value.ready) {
      route("/");
    } else {
      lockedAndLoaded = false;
    }
  }

  return (
    <div class="with-header">
      <Header />
      <div class="body">
        {lockedAndLoaded ? (
          <AdminBody state={state.value} />
        ) : (
          <em>Loading…</em>
        )}
      </div>
    </div>
  );
}
