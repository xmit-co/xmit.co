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
} from "./app.tsx";
import { route } from "preact-router";
import { useContext, useState } from "preact/hooks";
import { enroll } from "./webauthn.tsx";
import { Footer } from "./footer.tsx";
import { Link } from "preact-router/match";
import { EditableText } from "./editableText.tsx";
import { CredInfo, Invite, Site, State, Team, User } from "./models.tsx";

function dateTime(t: number) {
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
    <li>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        submit={(v) => sendUpdate(["p", id], new Map([[1, v]]))}
      />
      <button class="delete" onClick={() => sendUpdate(["p", id])}>
        ✕
      </button>
      <br />
      created {dateTime(info.createdAt)}
    </li>
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
  return (
    <li>
      <EditableText
        value={info.name}
        placeholder="Name"
        whenMissing="unnamed"
        submit={(v) => sendUpdate(["k", id], new Map([[1, v]]))}
      />
      {raw ? (
        <button onClick={() => navigator.clipboard.writeText(raw)}>📋</button>
      ) : null}
      <button class="delete" onClick={() => sendUpdate(["k", id])}>
        ✕
      </button>
      <br />
      created {dateTime(info.createdAt)}
    </li>
  );
}

function Members({ state, team }: { state: State; team: Team }) {
  if (team.users === undefined || team.users.size === 0) {
    return <em>No members.</em>;
  }
  const users = Array.from(team.users.keys())
    .map((id) => loadUser(state, id))
    .map((u) => ({ name: u?.name || `#${u?.id}`, id: u?.id || 0 }));
  const teamID = team.id || 0;
  return (
    <ul>
      {users.map((u) => (
        <li>
          {u.name}
          {users.length > 1 && (
            <button
              class="delete"
              onClick={() => sendUpdate(["t", teamID, "u", u.id])}
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Invites({ team, state }: { team: Team; state: State }) {
  if (!team.invites || team.invites.size === 0) {
    return null;
  }
  const entries = [...team.invites.keys()].map((id) => {
    const invite = loadInvite(state, id);
    const user = invite && loadUser(state, invite.creatingUserID);
    return { invite, user };
  }) as { invite: Invite; user: User | undefined }[];
  return (
    <>
      <h3>
        <span class="icon">💌</span>Invites
      </h3>
      <ul>
        {entries.map((i) => (
          <li>
            {dateTime(i.invite.createdAt)} by {i.user?.name || <em>unknown</em>}{" "}
            <button onClick={() => navigator.clipboard.writeText(i.invite.id)}>
              📋
            </button>
            <button
              class="delete"
              onClick={() => sendUpdate(["i", i.invite.id])}
            >
              ✕
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
    <li>
      <Link href={`/site/${siteID}`}>
        #{siteID}: {site.name || <em>unnamed</em>}
      </Link>
    </li>
  );
}

function SiteList({ state, team }: { state: State; team: Team }) {
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

function TeamView({
  session,
  id,
  state,
}: {
  session: Session;
  id: number;
  state: State;
}) {
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
            submit={(v) => sendUpdate(["t", id], new Map([[1, v]]))}
          />
          <button class="delete" onClick={() => sendUpdate(["t", id])}>
            ✕
          </button>
        </h2>
      </div>
      <div className="ssections">
        <div>
          <h3>
            <span className="icon">🔑️</span>API keys{" "}
            <button className="add" onClick={() => sendUpdate(["t", id, "k"])}>
              +
            </button>
          </h3>
          <APIKeyList session={session} keys={team.apiKeys} />
        </div>
        <div>
          <h3>
            <span className="icon">👥</span>Members{" "}
            <button className="add" onClick={() => sendUpdate(["t", id, "i"])}>
              +
            </button>
          </h3>
          <Members team={team} state={state} />
          <Invites team={team} state={state} />
        </div>
        <div>
          <h3>
            <span className="icon">🌐</span>Sites
          </h3>
          <SiteList state={state} team={team} />
        </div>
        <div>
          <h3>
            <span className="icon">⚙️</span>Default settings{" "}
          </h3>
          <div className="todo">TODO</div>
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
              k.every((v, i) => id[i] === v),
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

function AdminBody({ session, state }: { session: Session; state: State }) {
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
              submit={(v) => sendUpdate("u", new Map([[2, v]]))}
            />
          </h2>
        </div>
        <div class="ssections">
          <div>
            <h3>
              <span className="icon">🔑</span>API keys{" "}
              <button className="add" onClick={() => sendUpdate("k")}>
                +
              </button>
            </h3>
            <APIKeyList session={session} keys={user.apiKeys} />
          </div>
          <div>
            <h3>
              <span className="icon">🔐</span>Web passkeys{" "}
              <button className="add" onClick={() => enroll().catch(logError)}>
                +
              </button>
            </h3>
            <WebPasskeyList keys={user.webKeys} />
          </div>
          <div>
            <h3>
              <span className="icon">📇</span>Contact
            </h3>
            <div>
              If we <em>need</em> to reach out?
              <br />
              <EditableText
                value={user.phone}
                whenMissing="No phone #"
                placeholder="Phone #"
                type="tel"
                submit={(v) => sendUpdate("u", new Map([[6, v]]))}
              />
              <br />
              <EditableText
                value={user.email}
                whenMissing="No E-mail"
                placeholder="Email"
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
        <TeamView id={id} state={state} session={session} />
      ))}
    </>
  );
}

export function Admin() {
  const state = useContext(StateCtx);
  const ready = state.value.ready;
  const session = loadSession(state.value);
  if (ready && session?.uid === undefined) {
    route("/");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <div class="body">
        {ready && session !== undefined ? (
          <AdminBody session={session} state={state.value} />
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
