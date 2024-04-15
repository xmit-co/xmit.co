import { loadSession, logError, reconnectChannel, StateCtx } from "./app.tsx";
import { route } from "preact-router";
import { enroll, signin } from "./webauthn.tsx";
import { useContext } from "preact/hooks";
import { Footer } from "./footer.tsx";
import { title } from "./header.tsx";

export function Home() {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  if (uid !== undefined) {
    route("/admin");
    return <></>;
  }
  const mark = state.ready ? "🔴" : "🟡";

  return (
    <div class="home">
      <h1>
        {title} <span class="mark">{mark}</span>
      </h1>
      <p>
        We host your static web pages, including single page apps, for free.
      </p>
      <p>
        With efficient uploads &amp; a blazing fast admin interface, we promise
        not to waste your time.
      </p>
      <p>
        <a href="https://xmit.dev/posts/origin/">
          Learn more from our first post
        </a>
        .
      </p>
      <div>
        <button onClick={() => route("/docs")}>📚 docs</button>
        <button
          onClick={() =>
            enroll()
              .then(() => reconnectChannel.postMessage(undefined))
              .catch(logError)
          }
        >
          🤗 first time
        </button>
        <button onClick={() => signin().catch(logError)}>🧐 returning</button>
      </div>
      <Footer />
    </div>
  );
}

export function AuthRequired({ url }: { url: string }) {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  if (uid !== undefined) {
    window.location.href = url;
    return <></>;
  }
  return (
    <div class="home">
      <h1>🔐 Authentication required</h1>
      <p>
        You must{" "}
        <button onClick={() => signin().catch(logError)}>sign in</button>
        to access <code>{url}</code>
      </p>
    </div>
  );
}
