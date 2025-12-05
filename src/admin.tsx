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
import {
  CredInfo,
  Invite,
  Site,
  SiteSettings,
  Team,
  TeamLabel,
  teamLabelPrefix,
  User,
} from "./models.tsx";
import { u8eq } from "./utils.ts";

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
        ref={(e) => {
          e?.focus();
        }}
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
      <button
        class="delete"
        onClick={() => {
          if (window.confirm("Are you sure?")) sendUpdate(["p", id]);
        }}
      >
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
      #{user.id}: {user.name || <em>anonymous</em>}
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
  const createdBy = loadUser(state, info.createdBy);
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
      <button
        class="delete"
        onClick={() => {
          if (window.confirm("Are you sure?")) sendUpdate(["k", id]);
        }}
      >
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
    return (
      <p>
        <em>None.</em>
      </p>
    );
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
            <>
              {" "}
              <button
                class="delete"
                onClick={() => {
                  if (window.confirm("Are you sure?"))
                    sendUpdate(["t", teamID, "u", u?.id || 0]);
                }}
              >
                ✕ exclude
              </button>
            </>
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
    const user = invite && loadUser(state, invite.creatingUserID);
    return { invite, user };
  }) as { invite: Invite; user: User | undefined }[];
  entries.sort((a, b) => (b.invite.createdAt || 0) - (a.invite.createdAt || 0));
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
      <Link href={`/admin/site/${siteID}`}>
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
    return (
      <p>
        <em>None.</em>
      </p>
    );
  }
  return <ul>{sites.map((site) => site && <SiteView site={site} />)}</ul>;
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
          onClick={(e) => {
            sendUpdate(
              updateKey,
              new Map([[1, (e.target as HTMLInputElement).checked]]),
            );
            e.preventDefault();
          }}
        />{" "}
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
    <>
      <div class="breadcrumb">
        <Link href="/admin">← Admin</Link>
      </div>
      <h1>
        <span class="icon">🏭</span>
        {teamLabelPrefix(team.id || 0)}
        <EditableText
          type="text"
          value={team.name}
          whenMissing="unnamed"
          buttonText="rename"
          submit={(v) => sendUpdate(["t", id], new Map([[1, v]]))}
        />
        <button
          class="delete"
          onClick={() => {
            if (window.confirm("Are you sure?")) sendUpdate(["t", id]);
          }}
        >
          ✕ destroy
        </button>
      </h1>
      <section>
        <h2>
          <span class="icon">🔑️</span>API keys{" "}
          <button class="add" onClick={() => sendUpdate(["t", id, "k"])}>
            + create
          </button>
        </h2>
        <APIKeyList session={session} keys={team.apiKeys} />
      </section>
      <section>
        <h2>
          <span class="icon">⚙️</span>Default settings
        </h2>
        <SettingsView value={team.defaultSettings} updateKey={["t", id, "s"]} />
      </section>
      <section>
        <h2>
          <span class="icon">👥</span>Members{" "}
          <button class="add" onClick={() => sendUpdate(["t", id, "i"])}>
            + invite
          </button>
        </h2>
        <Members team={team} />
        <Invites team={team} />
      </section>
      <section>
        <h2>
          <span class="icon">🌐</span>Sites
        </h2>
        <SiteList team={team} />
      </section>
    </>
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
    return (
      <p>
        <em>None.</em>
      </p>
    );
  }
  const entries = Array.from(keys?.entries() || []);
  entries.sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  return (
    <ul>
      {entries.map(([id, info]) => (
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
    return (
      <p>
        <em>None.</em>
      </p>
    );
  }
  return (
    <ul>
      {Array.from(keys.entries() || []).map(([id, info]) => (
        <WebKey id={id} info={info} />
      ))}
    </ul>
  );
}

export function UserAdminBody({ session }: { session: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session.uid;
  const user = loadUser(state, uid);
  if (user === undefined) {
    return <></>;
  }
  return (
    <>
      <div class="breadcrumb">
        <Link href="/admin">← Admin</Link>
      </div>
      <h1>
        <span class="icon">👤</span>User #{uid}:{" "}
        <EditableText
          type="text"
          value={user.name}
          whenMissing="anonymous"
          buttonText="rename"
          submit={(v) => sendUpdate("u", new Map([[2, v]]))}
        />
      </h1>
      <section>
        <h2>
          <span class="icon">📇</span>Contact
        </h2>
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
      </section>
      <section>
        <h2>
          <span class="icon">🔑</span>API keys{" "}
          <button class="add" onClick={() => sendUpdate("k")}>
            + create
          </button>
        </h2>
        <APIKeyList session={session} keys={user.apiKeys} />
      </section>
      <section>
        <h2>
          <span class="icon">🔐</span>Web passkeys{" "}
          <button class="add" onClick={() => enroll().catch(logError)}>
            + create
          </button>
        </h2>
        <WebPasskeyList keys={user.webKeys} />
      </section>
    </>
  );
}

export function TeamAdminBody({
  session,
  id,
}: {
  session: Session;
  id: number;
}) {
  return <TeamView session={session} id={id} />;
}

function TeamSummary({ teamID }: { teamID: number }) {
  const state = useContext(StateCtx).value;
  const team = loadTeam(state, teamID);
  if (team === undefined) {
    return <></>;
  }

  const memberIDs = [...(team.users?.keys() || [])];
  const siteIDs = [...(team.sites?.keys() || [])];

  return (
    <div style={{ marginBottom: "1.5em" }}>
      <h4>
        <Link href={`/admin/team/${teamID}`}>
          <TeamLabel id={teamID} name={team.name} />
        </Link>
      </h4>
      {memberIDs.length > 0 && (
        <>
          <strong>Members:</strong>{" "}
          {memberIDs.map((id, idx) => {
            const user = loadUser(state, id);
            return (
              <span key={id}>
                {idx > 0 && ", "}#{id}: {user?.name || <em>anonymous</em>}
              </span>
            );
          })}
          <br />
        </>
      )}
      <strong>Sites:</strong>{" "}
      {siteIDs.length > 0 ? (
        siteIDs.map((id, idx) => {
          const site = loadSite(state, id);
          return (
            <span key={id}>
              {idx > 0 && ", "}
              <Link href={`/admin/site/${id}`}>{site?.name || `#${id}`}</Link>
            </span>
          );
        })
      ) : (
        <em>none</em>
      )}
    </div>
  );
}

function AdminBody({ session }: { session: Session }) {
  const state = useContext(StateCtx).value;
  const uid = session.uid;
  const user = loadUser(state, uid);
  if (user === undefined) {
    return <></>;
  }
  const teamIDs = [...(user.teams?.keys() || [])];
  teamIDs.sort((a, b) => b - a);
  return (
    <>
      <h1>
        <span class="icon">🛠</span>Admin
      </h1>
      <section>
        <h2>
          <span class="icon">👤</span>User {nameAndID(user)}
        </h2>
        <p>
          <Link href="/admin/user">
            Manage profile, API keys and web passkeys
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>
          <span class="icon">🏭</span>Teams
        </h2>
        <div style={{ display: "flex", gap: "0.5em" }}>
          <button class="add" onClick={() => sendUpdate("t")}>
            + new team
          </button>
          <JoinTeam />
        </div>
        {teamIDs.length > 0 ? (
          <>
            {teamIDs.map((id) => (
              <TeamSummary key={id} teamID={id} />
            ))}
          </>
        ) : (
          <p>
            <em>None.</em>
          </p>
        )}
      </section>
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
      <main>
        {!ready ? (
          <h1>Loading…</h1>
        ) : (
          session && <AdminBody session={session} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export function UserAdmin() {
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
      <main>
        {!ready ? (
          <h1>Loading…</h1>
        ) : (
          session !== undefined && <UserAdminBody session={session} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export function TeamAdmin({ id }: { id: string }) {
  const state = useContext(StateCtx).value;
  const ready = state.ready;
  const session = loadSession(state);
  if (ready && session?.uid === undefined) {
    route("/");
    return <></>;
  }
  const teamID = Number(id);
  const team = loadTeam(state, teamID);
  if (ready && team === undefined) {
    route("/admin");
    return <></>;
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <main>
        {!ready ? (
          <h1>Loading…</h1>
        ) : (
          session !== undefined && (
            <TeamAdminBody session={session} id={teamID} />
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
