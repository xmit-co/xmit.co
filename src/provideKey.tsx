import { useContext, useState, useEffect } from "preact/hooks";
import { route } from "preact-router";
import {
  loadKeyRequest,
  loadSession,
  loadTeam,
  loadUser,
  logError,
  sendUpdate,
  StateCtx,
} from "./app.tsx";
import { Header } from "./header.tsx";
import { Footer } from "./footer.tsx";
import { enroll, signin } from "./webauthn.tsx";

export function ProvideKey({ id }: { id: string }) {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  const keyRequest = loadKeyRequest(state, id);
  const [selectedTeam, setSelectedTeam] = useState<number | undefined>(
    undefined,
  );
  const [keyRequestLoaded, setKeyRequestLoaded] = useState(false);

  // Subscribe to the key request when the component mounts and state is ready
  useEffect(() => {
    if (state.ready) {
      // Send empty update to subscribe to the key request
      sendUpdate(["r", id]);
    }
  }, [id, state.ready]);

  // Mark as loaded once we have a response (either the key request exists or doesn't)
  useEffect(() => {
    if (keyRequest) {
      // Key request loaded successfully
      setKeyRequestLoaded(true);
    } else if (state.ready) {
      // Give the WebSocket a moment to respond to the subscription
      // If no key request appears after this delay, we assume it doesn't exist
      const timer = setTimeout(() => {
        setKeyRequestLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.ready, keyRequest]);

  // Handle Escape key to cancel the request
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        route("/admin");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCancel = () => {
    // Try to close the window/tab
    window.close();
    // If window.close() doesn't work (not opened by script), navigate away
    route("/admin");
  };

  // Loading - waiting for state to be ready
  if (!state.ready) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>🔑 API Key Request</h1>
          <div class="section">
            <p>Loading…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (uid === undefined) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>🔑 API Key Request</h1>

          <div class="section">
            <h2>
              <span class="icon">📋</span>Request Details
            </h2>
            {keyRequest?.name && (
              <p>
                <strong>Application:</strong> {keyRequest.name}
              </p>
            )}
            <p>
              <strong>Request ID:</strong> <code>{id}</code>
            </p>
            <p>
              Please verify this matches the identifier shown in the
              application.
            </p>
          </div>

          <div class="section">
            <p>To provide an API key, sign up or sign in first.</p>
            <p>
              <button onClick={() => enroll().catch(logError)}>
                🤗 Sign up
              </button>{" "}
              <button onClick={() => signin().catch(logError)}>
                🚪 Sign in
              </button>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading - waiting for state and key request subscription
  if (!state.ready || !keyRequestLoaded) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>🔑 API Key Request</h1>
          <div class="section">
            <p>Loading…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Key request not found or expired
  if (!keyRequest) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>🔑 API Key Request</h1>
          <div class="section">
            <h2>
              <span class="icon">❌</span>Not Found
            </h2>
            <p>
              This key request (ID: <code>{id}</code>) was not found or has
              expired.
            </p>
            <p>
              Key requests expire after 10 minutes. Please create a new request
              from your application.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Key already provided
  if (keyRequest.key) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>API Key Provided</h1>
          <div class="section">
            <p>You can close this and return to your application.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get user and teams
  const user = loadUser(state, uid);
  if (!user) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main class="home">
          <h1>🔑 API Key Request</h1>
          <div class="section">
            <h2>
              <span class="icon">❌</span>User Not Found
            </h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const teams = Array.from(user.teams || []).map(([teamID]) => ({
    id: teamID,
    team: loadTeam(state, teamID),
  }));

  const handleApprove = () => {
    const approvalData = selectedTeam !== undefined ? { 1: selectedTeam } : {};
    sendUpdate(["r", id], approvalData);
  };

  return (
    <div class="with-header">
      <Header session={session} />
      <main class="home">
        <h1>🔑 API Key Request</h1>

        <div class="section">
          <h2>
            <span class="icon">📋</span>Request Details
          </h2>
          {keyRequest.name && (
            <p>
              <strong>Application:</strong> {keyRequest.name}
            </p>
          )}
          <p>
            <strong>Request ID:</strong> <code>{id}</code>
          </p>
          <p>
            Please verify this matches the identifier shown in the application.
          </p>
        </div>

        <div class="section">
          <h2>
            <span class="icon">🔐</span>Select Account
          </h2>
          <div class="account-selector">
            <label>
              <input
                type="radio"
                name="account"
                checked={selectedTeam === undefined}
                onChange={() => setSelectedTeam(undefined)}
              />{" "}
              👤 #{uid}: {user.name || "Personal Account"}
            </label>
            {teams.map(({ id: teamID, team }) => (
              <label key={teamID}>
                <input
                  type="radio"
                  name="account"
                  checked={selectedTeam === teamID}
                  onChange={() => setSelectedTeam(teamID)}
                />{" "}
                🏭 #{teamID}: {team?.name || "Loading..."}
              </label>
            ))}
          </div>
          <div>
            <button onClick={handleApprove}>✅ Provide API Key</button>
            <button onClick={handleCancel}>❌ Cancel</button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
