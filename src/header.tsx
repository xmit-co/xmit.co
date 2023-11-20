import { Link } from "preact-router/match";
import { disconnect, State } from "./app.tsx";
import { signout } from "./webauthn.tsx";

export function Header({ state }: { state: State }) {
  const session = state.kv.get("session");
  let loggedIn = false;
  if (session !== undefined && session.get(1) !== undefined) {
    loggedIn = true;
  }

  if (loggedIn) {
    return (
      <div class="header">
        <h1>🛰 xmit — launch fast</h1>
        <div>
          <Link activeClassName="header-active" href="/admin">
            🛠 admin
          </Link>
          <Link activeClassName="header-active" href="/docs">
            📚 docs
          </Link>
          <Link onClick={() => signout().then(disconnect)}>🔓 sign out</Link>
        </div>
      </div>
    );
  }
  return (
    <div class="header">
      <h1>🛰 xmit — launch fast</h1>
      <div>
        <Link activeClassName="header-active" href="/docs">
          📚 docs
        </Link>
        <Link activeClassName="header-active" href="/">
          🚪 enter
        </Link>
      </div>
    </div>
  );
}
