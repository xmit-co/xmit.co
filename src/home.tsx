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
  const hasCredentials = navigator.credentials !== undefined;

  let message = undefined;
  if (!hasCredentials) {
    message = (
      <p className="red">
        Your browser appears not to support webauthn. Unfortunately, you'll have
        to use another one to authenticate.
      </p>
    );
  } else {
    if (navigator.userAgent.includes("Linux")) {
      message = (
        <p>
          Under{" "}
          {(navigator.userAgent.includes("Android") && "Android") || "Linux"},
          we recommend credentials managers like the free{" "}
          <a href="https://bitwarden.com/download/" target="_blank">
            bitwarden
          </a>{" "}
          if authentication is difficult.
        </p>
      );
    }
  }

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
      {message}
      <div>
        <button onClick={() => route("/docs")}>📚 docs</button>
        <button
          onClick={() =>
            enroll()
              .then(() => reconnectChannel.postMessage(undefined))
              .catch(logError)
          }
        >
          🤗 sign up
        </button>
        <button onClick={() => signin().catch(logError)}>🧐 sign in</button>
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
