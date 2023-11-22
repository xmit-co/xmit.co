import { Link } from "preact-router/match";
import { logError, Session, StateCtx } from "./app.tsx";
import { signout } from "./webauthn.tsx";
import { useContext } from "preact/hooks";

export function Header({ session }: { session?: Session }) {
  const state = useContext(StateCtx);
  const uid = session?.uid;

  const mark = state.value.ready ? (uid !== undefined ? "🟢" : "🔴") : "🟡";

  if (uid !== undefined) {
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
          <Link onClick={() => signout().catch(logError)}>🔓 sign out</Link>
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
