import { useContext } from "preact/hooks";
import { route } from "preact-router";
import { Header } from "./header.tsx";
import { Site, State } from "./models.tsx";
import { EditableText } from "./editableText.tsx";
import { Footer } from "./footer.tsx";
import { loadSession, loadSite, sendUpdate, StateCtx } from "./app.tsx";
import { SettingsView } from "./admin.tsx";

function SiteAdminBody({ site, state: _ }: { site: Site; state: State }) {
  const siteID = site.id || 0;
  return (
    <div class="section">
      <div class="ssections">
        <h2>
          <span className="icon">🌐</span>
          <EditableText
            value={site.name}
            whenMissing="unnamed"
            submit={(v) => sendUpdate(["s", siteID], new Map([[1, v]]))}
          />
          <button class="delete" onClick={() => sendUpdate(["s", siteID])}>
            ✕
          </button>
        </h2>
      </div>
      <div class="ssections">
        <div>
          <h3>
            <span className="icon">📤</span>Uploads
          </h3>
          <div className="todo">TODO</div>
        </div>
        <div>
          <h3>
            <span className="icon">🚀</span>Launches
          </h3>
          <div className="todo">TODO</div>
        </div>
        <div>
          <h3>
            <span className="icon">🔗</span>Domains
          </h3>
          <div className="todo">TODO</div>
        </div>
        <div>
          <h3>
            <span className="icon">⚙️</span>Settings
          </h3>
          <SettingsView value={site.settings} updateKey={["s", siteID, "s"]} />
        </div>
      </div>
    </div>
  );
}

export function SiteAdmin({ id }: { id: string }) {
  const state = useContext(StateCtx);
  const ready = state.value.ready;
  const session = loadSession(state.value);
  if (ready && session?.uid === undefined) {
    route("/");
    return <></>;
  }
  const site = loadSite(state.value, Number(id));
  if (ready && site === undefined) {
    route("/admin");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="body">
        {ready && site !== undefined ? (
          <SiteAdminBody state={state.value} site={site} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <em>Loading…</em>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
