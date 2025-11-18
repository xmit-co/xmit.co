import { useContext, useState, useEffect } from "preact/hooks";
import { route } from "preact-router";
import { loadKeyRequest, loadSession, loadTeam, loadUser, logError, sendUpdate, StateCtx } from "./app.tsx";
import { enroll, signin } from "./webauthn.tsx";
import { Header } from "./header.tsx";
import { Footer } from "./footer.tsx";

export function ProvideKey({ id }: { id: string }) {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  const keyRequest = loadKeyRequest(state, id);
  const [selectedTeam, setSelectedTeam] = useState<number | undefined>(undefined);
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
    window.close();
  };

  // Not logged in - show sign in/sign up
  if (uid === undefined) {
    return (
      <div class="with-header">
        <Header session={session} />
        <div class="home">
          <h1>🔑 API Key requested</h1>
          {keyRequest?.name && (
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
          <p>
            To provide an API key, you must first authenticate:
          </p>
          <div style={{ marginTop: "2em" }}>
            <button
              onClick={() =>
                enroll()
                  .catch(logError)
              }
            >
              🤗 sign up
            </button>
            <button onClick={() => signin().catch(logError)}>🧐 sign in</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Loading - waiting for state and key request subscription
  if (!state.ready || !keyRequestLoaded) {
    return (
      <div class="with-header">
        <Header session={session} />
        <div class="home">
          <h1>Loading…</h1>
        </div>
        <Footer />
      </div>
    );
  }

  // Key request not found or expired
  if (!keyRequest) {
    return (
      <div class="with-header">
        <Header session={session} />
        <div class="home">
          <h1>❌ Key Request Not Found</h1>
          <p>
            This key request (ID: <code>{id}</code>) was not found or has expired.
          </p>
          <p>
            Key requests expire after 10 minutes. Please create a new request from your application.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Key already provided
  if (keyRequest.key) {
    return (
      <div class="with-header">
        <Header session={session} />
        <div class="home">
          <h1>✅ Key Already Provided</h1>
          <p>
            An API key has already been provided for this request.
          </p>
        </div>
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
        <div class="home">
          <h1>❌ User Not Found</h1>
        </div>
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
    window.close();
  };

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="home">
        <h1>🔑 API Key requested</h1>
        {keyRequest.name && (
          <p>
            <strong>Application:</strong> {keyRequest.name}
          </p>
        )}
        <p>
          <strong>Request ID:</strong> <code>{id}</code>
        </p>

        {teams.length > 0 && (
          <div>
            <div class="account-selector">
              <label>
                <input
                  type="radio"
                  name="account"
                  checked={selectedTeam === undefined}
                  onChange={() => setSelectedTeam(undefined)}
                />
                {" "}👤 Personal Account ({user.name || `User #${uid}`})
              </label>
              {teams.map(({ id: teamID, team }) => (
                <label key={teamID}>
                  <input
                    type="radio"
                    name="account"
                    checked={selectedTeam === teamID}
                    onChange={() => setSelectedTeam(teamID)}
                  />
                  {" "}🏭 {team?.name || `Team #${teamID}`}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <button onClick={handleApprove}>
            ✅ Provide an API key
          </button>
          <button onClick={handleCancel}>
            ❌ Cancel
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
