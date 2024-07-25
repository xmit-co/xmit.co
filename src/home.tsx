import {
  loadSession,
  loadSite,
  loadUpload,
  logError,
  reconnectChannel,
  StateCtx,
} from "./app.tsx";
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
      <p class="red">
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
      <div style={{ marginTop: "2em" }}>
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
  const u = new URL(url);
  const match = u.hostname.match("^(\\d+)\\.(\\d+)*");
  if (!match) {
    return (
      <div class="home">
        <h1>Unsupported URL</h1>
      </div>
    );
  }
  const uploadID = Number(match[1]);
  const siteID = Number(match[2]);
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  if (uid !== undefined) {
    const site = loadSite(state, siteID);
    if (!site) {
      return (
        <div class="home">
          <h1>🛑 Not authorized</h1>
        </div>
      );
    }
    const bundle = loadUpload(state, siteID, uploadID)?.bundle;
    if (!bundle) {
      return (
        <div class="home">
          <h1>😢 Bundle not found</h1>
        </div>
      );
    }
    const bundleHex = Array.from(bundle)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    u.search = `?:${bundleHex}:${u.search.length > 0 ? u.search.substring(1) : ""}`;
    window.location.href = u.toString();
    return (
      <div class="home">
        <h1>Redirecting…</h1>
      </div>
    );
  }
  if (state.ready) {
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
  return (
    <div class="home">
      <h1>Loading…</h1>
    </div>
  );
}
