import { Link } from "preact-router/match";
import { connect, StateCtx } from "./app.tsx";
import { signout } from "./webauthn.tsx";
import { useContext } from "preact/hooks";

export function Header() {
  const state = useContext(StateCtx);
  const session = state.value.kv.get("session");

  let loggedIn = false;
  if (session !== undefined && session.get(1) !== undefined) {
    loggedIn = true;
  }
  const mark = state.value.ready ? (loggedIn ? "🟢" : "🔴") : "🟡";

  if (loggedIn) {
    return (
      <div class="header">
        <h1>
          🛰 xmit — launch fast <span class="mark">{mark}</span>
        </h1>
        <div>
          <Link activeClassName="header-active" href="/docs">
            📚 docs
          </Link>
          <Link activeClassName="header-active" href="/admin">
            🛠 admin
          </Link>
          <Link onClick={() => signout().then(connect)}>🔓 sign out</Link>
        </div>
      </div>
    );
  }
  return (
    <div class="header">
      <h1>
        🛰 xmit — launch fast <span className="mark">{mark}</span>
      </h1>
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
