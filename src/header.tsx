import { Link } from "preact-router/match";
import { logError, reconnectChannel, Session, StateCtx } from "./app.tsx";
import { enroll, signin, signout } from "./webauthn.tsx";
import { useContext } from "preact/hooks";
import { route } from "preact-router";

export const title = "🛰 xmit — launch fast";

function LoadingSpinner() {
  return <span class="spinner">⟳</span>;
}

export function Header({ session }: { session?: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session?.uid;
  const ready = state.ready;

  return (
    <header>
      <div class="header-left">
        <h1>
          <Link href="/">{title}</Link>
        </h1>
        {!ready && <LoadingSpinner />}
      </div>
      <nav>
        <Link activeClassName="header-active" href="/docs">
          📚 docs
        </Link>
        {uid !== undefined ? (
          <>
            <Link activeClassName="header-active" href="/admin">
              🛠 admin
            </Link>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                signout().catch(logError);
              }}
            >
              🚪 sign out
            </a>
          </>
        ) : (
          <>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                enroll()
                  .then(() => {
                    reconnectChannel.postMessage(undefined);
                    route("/admin");
                  })
                  .catch(logError);
              }}
            >
              🤗 sign up
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                signin()
                  .then(() => route("/admin"))
                  .catch(logError);
              }}
            >
              🚪 sign in
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
