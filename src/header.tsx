import { route } from "preact-router";
import { Link } from "preact-router/match";
import { useContext, useEffect } from "preact/hooks";
import { logError, Session, StateCtx } from "./app.tsx";
import { enroll, signin, signout } from "./webauthn.tsx";

let pendingRedirect: string | null = null;

export const title = "🛰 xmit";

function LoadingSpinner() {
  return <span class="spinner">⟳</span>;
}

export function Header({ session }: { session?: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session?.uid;
  const ready = state.ready;

  // Check for pending redirect after sign-in
  useEffect(() => {
    if (ready && uid !== undefined && pendingRedirect) {
      const target = pendingRedirect;
      pendingRedirect = null;
      route(target);
    }
  }, [ready, uid]);

  return (
    <header>
      <div class="header-left">
        <h1>
          <Link href="/">{title}</Link>
        </h1>
      </div>
      <nav>
        <Link activeClassName="header-active" href="/docs">
          📚 docs
        </Link>
        {!ready ? null : uid !== undefined ? (
          <>
            <Link activeClassName="header-active" href="/admin">
              🛠 admin
            </Link>
            <Link activeClassName="header-active" href="/analytics">
              📊 analytics
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
                const currentPath = window.location.pathname;
                enroll()
                  .then(() => {
                    route(currentPath === "/" ? "/admin" : currentPath);
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
                const currentPath = window.location.pathname;
                const search = window.location.search;
                pendingRedirect =
                  currentPath === "/" ? "/admin" : currentPath + search;
                signin().catch(logError);
              }}
            >
              🚪 sign in
            </a>
          </>
        )}
        {!ready && <LoadingSpinner />}
      </nav>
    </header>
  );
}
