import { Link } from "preact-router/match";
import { logError, Session, StateCtx } from "./app.tsx";
import { signout } from "./webauthn.tsx";
import { useContext } from "preact/hooks";

export const title = "🛰 xmit — launch fast";

export function Header({ session }: { session?: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session?.uid;

  const mark = state.ready ? (uid !== undefined ? "🟢" : "🔴") : "🟡";

  if (uid !== undefined) {
    return (
      <header>
        <h1>
          {title} <span class="mark">{mark}</span>
        </h1>
        <div>
          <Link activeClassName="header-active" href="/docs">
            📚 docs
          </Link>
          <Link activeClassName="header-active" href="/admin">
            🛠 admin
          </Link>
          <Link onClick={() => signout().catch(logError)}>🚪 sign out</Link>
        </div>
      </header>
    );
  }
  return (
    <header>
      <h1>
        {title} <span class="mark">{mark}</span>
      </h1>
      <div>
        <Link activeClassName="header-active" href="/docs">
          📚 docs
        </Link>
        <Link activeClassName="header-active" href="/">
          🚪 enter
        </Link>
      </div>
    </header>
  );
}
