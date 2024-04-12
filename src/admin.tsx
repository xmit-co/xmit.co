import { Header } from "./header.tsx";
import {
  loadInvite,
  loadSession,
  loadSite,
  loadTeam,
  loadUser,
  logError,
  sendUpdate,
  Session,
  StateCtx,
  u8eq,
} from "./app.tsx";
import { route } from "preact-router";
import { useContext, useState } from "preact/hooks";
import { enroll } from "./webauthn.tsx";
import { Footer } from "./footer.tsx";
import { Link } from "preact-router/match";
import { EditableText } from "./editableText.tsx";
import { CredInfo, Invite, Site, SiteSettings, Team, User } from "./models.tsx";

export function dateTime(t: number | undefined) {
  if (t === undefined) {
    return "unknown";
  }
  return new Date(t * 1000).toISOString().split(".")[0] + "Z";
}

function JoinTeam() {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="password"
        placeholder="Invite code"
        ref={(e) => e && e.focus()}
        onFocusOut={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const code = (e.target as HTMLInputElement).value;
            if (code !== "") sendUpdate(["i", code]);
            setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button class="add" onClick={() => setEditing(true)}>
      ⨝ join a team
    </button>
  );
}

function WebKey({ id, info }: { id: string; info: CredInfo }) {
  return (
    <li key={id}>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        buttonText="rename"
        submit={(v) => sendUpdate(["p", id], new Map([[1, v]]))}
      />
      <button class="delete" onClick={() => sendUpdate(["p", id])}>
        ✕ forget
      </button>
      <br />
      from {dateTime(info.createdAt)}
    </li>
  );
}

export function nameAndID(user: User | undefined) {
  if (user === undefined) {
    return <em>unknown</em>;
  }
  return (
    <>
      {user.name || <em>anonymous</em>} (#{user.id})
    </>
  );
}

function APIKey({
  id,
  info,
  raw,
}: {
  id: Uint8Array;
  info: CredInfo;
  raw: string | undefined;
}) {
  const state = useContext(StateCtx).value;
  const createdBy = loadUser(state, info.createdBy || 0);
  return (
    <li key={id}>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        buttonText="rename"
        submit={(v) => sendUpdate(["k", id], new Map([[1, v]]))}
      />
      {raw ? (
        <button
          onClick={() => navigator.clipboard.writeText(raw).catch(logError)}
        >
          📋 copy
        </button>
      ) : null}
      <button class="delete" onClick={() => sendUpdate(["k", id])}>
        ✕ forget
      </button>
      <br />
      from {dateTime(info.createdAt)} by{" "}
      {nameAndID(createdBy) || `#${info.createdBy}`}
    </li>
  );
}

function Members({ team }: { team: Team }) {
  if (team.users === undefined || team.users.size === 0) {
    return <em>No members.</em>;
  }
  const state = useContext(StateCtx).value;
  const users = Array.from(team.users.keys()).map((id) => loadUser(state, id));
  const teamID = team.id || 0;
  return (
    <ul>
      {users.map((u) => (
        <li key={u?.id || 0}>
          {nameAndID(u)}
          {users.length > 1 && (
            <button
              class="delete"
              onClick={() => sendUpdate(["t", teamID, "u", u?.id || 0])}
            >
              ✕ exclude
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Invites({ team }: { team: Team }) {
  if (!team.invites || team.invites.size === 0) {
    return null;
  }
  const state = useContext(StateCtx).value;
  const entries = [...team.invites.keys()].map((id) => {
    const invite = loadInvite(state, id);
    const user = invite && loadUser(state, invite.creatingUserID || 0);
    return { invite, user };
  }) as { invite: Invite; user: User | undefined }[];
  return (
    <>
      <h3>
        <span class="icon">💌</span>Invites
      </h3>
      <ul>
        {entries.map((i) => (
          <li key={i.invite.id}>
            {dateTime(i.invite.createdAt)} by {i.user?.name || <em>unknown</em>}{" "}
            <button
              onClick={() =>
                navigator.clipboard.writeText(i.invite.id).catch(logError)
              }
            >
              📋 copy
            </button>
            <button
              class="delete"
              onClick={() => sendUpdate(["i", i.invite.id])}
            >
              ✕ revoke
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function SiteView({ site }: { site: Site }) {
  const siteID = site.id || 0;
  return (
    <li key={siteID}>
      <Link href={`/site/${siteID}`}>
        #{siteID}: {site.name || <em>unnamed</em>}
      </Link>
    </li>
  );
}

function SiteList({ team }: { team: Team }) {
  const state = useContext(StateCtx).value;
  const sites = [...(team.sites?.keys() || [])].map((id) =>
    loadSite(state, id),
  );
  if (sites.length === 0) {
    return <em>No sites.</em>;
  }
  return (
    <ul>
      {sites.map((site) => (
        <SiteView site={site!} />
      ))}
    </ul>
  );
}

export function SettingsView({
  value,
  updateKey,
}: {
  value: SiteSettings | undefined;
  updateKey: (string | number)[];
}) {
  const publishInstantly = value?.publishInstantly || false;
  const password = value?.password;
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={publishInstantly}
          onChange={(e) =>
            sendUpdate(
              updateKey,
              new Map([[1, (e.target as HTMLInputElement).checked]]),
            )
          }
        />
        Launch on upload
      </label>
      <br />
      <label>
        <EditableText
          value={password}
          prefix="Password: "
          placeholder="Password"
          whenMissing="No password"
          submit={(v) => sendUpdate(updateKey, new Map([[2, v]]))}
        />
      </label>
    </div>
  );
}

function TeamView({ session, id }: { session: Session; id: number }) {
  const state = useContext(StateCtx).value;
  const team = loadTeam(state, id);
  if (team === undefined) {
    return <></>;
  }
  return (
    <div class="section">
      <div class="ssections">
        <h2>
          <span class="icon">🏭</span>#{team.id || 0}:{" "}
          <EditableText
            type="text"
            value={team.name}
            whenMissing="unnamed"
            buttonText="rename"
            submit={(v) => sendUpdate(["t", id], new Map([[1, v]]))}
          />
          <button class="delete" onClick={() => sendUpdate(["t", id])}>
            ✕ destroy
          </button>
        </h2>
      </div>
      <div class="ssections">
        <div>
          <h3>
            <span class="icon">⚙️</span>Default settings
          </h3>
          <SettingsView
            value={team.defaultSettings}
            updateKey={["t", id, "s"]}
          />
        </div>
        <div>
          <h3>
            <span class="icon">🔑️</span>API keys{" "}
            <button class="add" onClick={() => sendUpdate(["t", id, "k"])}>
              + create
            </button>
          </h3>
          <APIKeyList session={session} keys={team.apiKeys} />
        </div>
        <div>
          <h3>
            <span class="icon">👥</span>Members{" "}
            <button class="add" onClick={() => sendUpdate(["t", id, "i"])}>
              + invite
            </button>
          </h3>
          <Members team={team} />
          <Invites team={team} />
        </div>
        <div>
          <h3>
            <span class="icon">🌐</span>Sites
          </h3>
          <SiteList team={team} />
        </div>
      </div>
    </div>
  );
}

function APIKeyList({
  session,
  keys,
}: {
  session: Session;
  keys: Map<Uint8Array, CredInfo> | undefined;
}) {
  if (keys === undefined || keys.size === 0) {
    return <em>No keys.</em>;
  }
  return (
    <ul>
      {Array.from(keys?.entries() || []).map(([id, info]) => (
        <APIKey
          id={id}
          info={info}
          // TODO: complexity isn't great here, would be much better to index keys by hash
          raw={
            [...(session.createdAPIKeys?.entries() || [])].find(([k, _]) =>
              u8eq(k, id),
            )?.[1]
          }
        />
      ))}
    </ul>
  );
}

function WebPasskeyList({ keys }: { keys: Map<string, CredInfo> | undefined }) {
  if (keys === undefined || keys.size === 0) {
    return <em>No keys.</em>;
  }
  return (
    <ul>
      {Array.from(keys.entries() || []).map(([id, info]) => (
        <WebKey id={id} info={info} />
      ))}
    </ul>
  );
}

function AdminBody({ session }: { session: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session.uid;
  const user = loadUser(state, uid);
  if (user === undefined) {
    return <></>;
  }
  return (
    <>
      <div class="section">
        <div class="ssections">
          <h2>
            <span class="icon">👤</span>#{uid}:{" "}
            <EditableText
              type="text"
              value={user.name}
              whenMissing="anonymous"
              buttonText="rename"
              submit={(v) => sendUpdate("u", new Map([[2, v]]))}
            />
          </h2>
        </div>
        <div class="ssections">
          <div>
            <h3>
              <span class="icon">🔑</span>API keys{" "}
              <button class="add" onClick={() => sendUpdate("k")}>
                + create
              </button>
            </h3>
            <APIKeyList session={session} keys={user.apiKeys} />
          </div>
          <div>
            <h3>
              <span class="icon">🔐</span>Web passkeys{" "}
              <button class="add" onClick={() => enroll().catch(logError)}>
                + create
              </button>
            </h3>
            <WebPasskeyList keys={user.webKeys} />
          </div>
          <div>
            <h3>
              <span class="icon">📇</span>Contact
            </h3>
            <div>
              If we <em>need</em> to reach out?
              <br />
              <EditableText
                value={user.phone}
                whenMissing="No phone #"
                placeholder="Phone #"
                prefix="Phone #: "
                type="tel"
                submit={(v) => sendUpdate("u", new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user.email}
                whenMissing="No E-mail"
                placeholder="Email"
                prefix="Email: "
                type="email"
                submit={(v) => sendUpdate("u", new Map([[7, v]]))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button class="add" onClick={() => sendUpdate("t")}>
          + new team
        </button>
        <JoinTeam />
      </div>
      {[...(user.teams?.keys() || [])].map((id) => (
        <TeamView id={id} session={session} />
      ))}
    </>
  );
}

export function Admin() {
  const state = useContext(StateCtx).value;
  const ready = state.ready;
  const session = loadSession(state);
  if (ready && session?.uid === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="body">
        {ready && session !== undefined ? (
          <AdminBody session={session} />
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
