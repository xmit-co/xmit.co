import { route } from "preact-router";
import { useContext } from "preact/hooks";
import {
  loadSession,
  loadSite,
  loadUpload,
  logError,
  StateCtx,
} from "./app.tsx";
import { DomainChecker, useDomainChecker } from "./domainChecker.tsx";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import { enroll, signin } from "./webauthn.tsx";

export function Home() {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const hasCredentials = navigator.credentials !== undefined;
  const domainState = useDomainChecker();

  let message = undefined;
  if (!hasCredentials) {
    message = (
      <p class="red">
        Your browser appears not to support webauthn. Unfortunately, you'll have
        to use another one to authenticate.
      </p>
    );
  }

  // Show credential manager recommendation for non-Windows, non-Mac Firefox
  let credentialManagerMessage = undefined;
  const isFirefox = navigator.userAgent.includes("Firefox");
  const isWindows = navigator.userAgent.includes("Windows");
  const isMac = navigator.userAgent.includes("Mac");

  if (isFirefox && !isWindows && !isMac) {
    credentialManagerMessage = (
      <p>
        Under{" "}
        {(navigator.userAgent.includes("Android") && "Android") || "Linux"}{" "}
        Firefox, we recommend credentials managers like the free{" "}
        <a href="https://bitwarden.com/download/" target="_blank">
          bitwarden
        </a>{" "}
        if authentication is difficult.
      </p>
    );
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <main>
        <h1>
          <span class="icon">👋</span>Welcome to xmit!
        </h1>
        <section>
          <h2>
            <span class="icon">🚀</span>Fast, free static hosting
          </h2>
          <p>
            <span class="icon">⚡</span>Update your static website in seconds.
            Never send a file twice!
          </p>
          <p>
            <span class="icon">🔐</span>Authenticate with WebAuthn passkeys. No
            passwords to remember or leak.
          </p>
          <p>
            <span class="icon">📊</span>Built-in analytics. No cookies, no
            tracking scripts, no third parties.
          </p>
          <p>
            <span class="icon">🧰</span>The essentials are here.
            <br />
            Custom 404, custom headers, redirects, Single Page Apps, forms by
            E-mail.
            <br />
            HTTPS and HSTS, h2 and HTTP/3, transparent compression, ETags,
            accept-ranges, etc.
          </p>
          <p>
            <span class="icon">📖</span>
            <a href="https://xmit.dev/posts/origin/" target="_blank">
              Read the origin story
            </a>
            .
          </p>
          {message}
        </section>
        {credentialManagerMessage && (
          <section>{credentialManagerMessage}</section>
        )}
        <section>
          <h2>
            <span class="icon">🔍</span>Choose a domain
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (domainState.checkingDomain || !domainState.trimmedDomain) {
                return;
              }
              if (
                domainState.domainStatus !== "Taken" &&
                session?.uid !== undefined
              ) {
                route(
                  `/docs?domain=${encodeURIComponent(domainState.trimmedDomain)}`,
                );
              }
            }}
          >
            <DomainChecker state={domainState} />
            {!domainState.checkingDomain &&
              domainState.domainStatus !== "Taken" &&
              domainState.trimmedDomain &&
              (session?.uid !== undefined ? (
                <p>
                  <button type="submit">🚀 Launch</button>
                </p>
              ) : (
                <p>
                  <button
                    type="button"
                    onClick={() =>
                      enroll()
                        .then(() =>
                          route(
                            `/docs?domain=${encodeURIComponent(domainState.trimmedDomain)}`,
                          ),
                        )
                        .catch(logError)
                    }
                  >
                    🤗 Sign up
                  </button>{" "}
                  <button
                    type="button"
                    onClick={() =>
                      signin()
                        .then(() =>
                          route(
                            `/docs?domain=${encodeURIComponent(domainState.trimmedDomain)}`,
                          ),
                        )
                        .catch(logError)
                    }
                  >
                    🚪 Sign in
                  </button>
                </p>
              ))}
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function AuthRequired({ url }: { url: string }) {
  const u = new URL(url);
  const match = u.hostname.match("^(\\d+)\\.(\\d+)*");
  if (!match) {
    return (
      <main class="home">
        <h1>Unsupported URL</h1>
      </main>
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
        <main class="home">
          <h1>🛑 Not authorized</h1>
        </main>
      );
    }
    const bundle = loadUpload(state, siteID, uploadID)?.bundle;
    if (!bundle) {
      return (
        <main class="home">
          <h1>😢 Bundle not found</h1>
        </main>
      );
    }
    const bundleHex = Array.from(bundle)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    u.search = `?:${bundleHex}:${u.search.length > 0 ? u.search.substring(1) : ""}`;
    window.location.href = u.toString();
    return (
      <main class="home">
        <h1>Redirecting…</h1>
      </main>
    );
  }
  if (state.ready) {
    return (
      <main class="home">
        <h1>🔐 Authentication required</h1>
        <p>
          You must{" "}
          <button
            onClick={() =>
              signin()
                .then(() => route("/admin"))
                .catch(logError)
            }
          >
            sign in
          </button>
          to access <code>{url}</code>
        </p>
      </main>
    );
  }
  return (
    <main class="home">
      <h1>Loading…</h1>
    </main>
  );
}
