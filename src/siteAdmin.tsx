import { useContext } from "preact/hooks";
import { route } from "preact-router";
import { Link } from "preact-router/match";
import { Header } from "./header.tsx";
import { Site, Team, Upload } from "./models.tsx";
import { EditableText } from "./editableText.tsx";
import { Footer } from "./footer.tsx";
import {
  loadDomain,
  loadLaunch,
  loadSession,
  loadSite,
  loadTeam,
  loadUpload,
  loadUser,
  sendUpdate,
  StateCtx,
} from "./app.tsx";
import { dateTime, nameAndID, SettingsView } from "./admin.tsx";
import { u8eq } from "./utils.ts";

function shortHexHash(hash: Uint8Array | undefined) {
  if (hash === undefined) {
    return <>none</>;
  }
  return (
    <code>
      {Array.from(hash)
        .slice(0, 4)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}
    </code>
  );
}

const ourHost = window.location.host;
function previewURL(upload: Upload) {
  return `https://${upload.id}.${upload.siteID || 0}.${ourHost}/`;
}

function UploadList({
  site,
  deployedBundleID,
  uploadIDs,
}: {
  site: Site;
  deployedBundleID?: Uint8Array;
  uploadIDs: number[];
}) {
  const state = useContext(StateCtx).value;
  if (uploadIDs.length === 0) {
    return (
      <p>
        <em>None.</em>
      </p>
    );
  }
  const uploads = uploadIDs.map((id) => loadUpload(state, site.id, id));
  return (
    <ul>
      {uploads.map((upload) => {
        if (upload === undefined) {
          return (
            <li>
              <em>missing</em>
            </li>
          );
        }
        const isDeployed = u8eq(deployedBundleID, upload.bundle);
        const uploadKey = ["s", site.id || 0, "u", upload.id || 0];
        return (
          <li key={upload.id || 0}>
            <a href={previewURL(upload)} target="_blank">
              {upload.id} ({shortHexHash(upload.bundle)})
            </a>{" "}
            {isDeployed ? (
              <span class="live">live</span>
            ) : (
              <>
                <button onClick={() => sendUpdate(uploadKey, true)}>
                  🚀 launch
                </button>
                <button class="delete" onClick={() => sendUpdate(uploadKey)}>
                  ✕ destroy
                </button>
              </>
            )}
            <br />
            at {dateTime(upload.at)} by{" "}
            {nameAndID(loadUser(state, upload.by || 0))}
          </li>
        );
      })}
    </ul>
  );
}

function LaunchList({
  site,
  deployedBundleID,
  launchIDs,
}: {
  site: Site;
  deployedBundleID?: Uint8Array;
  launchIDs: number[];
}) {
  const state = useContext(StateCtx).value;
  if (launchIDs.length === 0) {
    return (
      <p>
        <em>None.</em>
      </p>
    );
  }
  const launches = launchIDs.map((id) => loadLaunch(state, site.id, id));
  return (
    <ul>
      {launches.map((launch) => {
        if (launch === undefined) {
          return;
        }
        const atBy = (
          <>
            at {dateTime(launch.at)} by{" "}
            {nameAndID(loadUser(state, launch.by || 0))}
          </>
        );
        const upload = loadUpload(state, site.id, launch.uploadID);
        if (upload === undefined) {
          return (
            <li key={launch.id || 0}>
              <em>Upload {launch.uploadID} destroyed</em>
              <br />
              {atBy}
            </li>
          );
        }
        const isDeployed = u8eq(deployedBundleID, upload.bundle);
        return (
          <li key={launch.id || 0}>
            <a href={previewURL(upload)} target="_blank">
              Upload {launch.uploadID} ({shortHexHash(upload?.bundle)})
            </a>{" "}
            {isDeployed ? (
              <span class="live">live</span>
            ) : (
              <button
                onClick={() =>
                  sendUpdate(["s", site.id || 0, "u", upload.id || 0], true)
                }
              >
                🚀 launch
              </button>
            )}
            <br />
            {atBy}
          </li>
        );
      })}
    </ul>
  );
}

function DomainsView({ site }: { site: Site }) {
  const state = useContext(StateCtx).value;
  const list =
    site.domains === undefined || site.domains.size === 0 ? (
      <p>
        <em>None.</em>
      </p>
    ) : (
      <ul>
        {Array.from(site.domains.keys()).map((domain) => {
          const domainInfo = loadDomain(state, domain);
          const certStatus = domainInfo?.cert;
          const hasCertError =
            certStatus && (certStatus.failures || certStatus.paused);
          return (
            <li key={domain}>
              <a href={`https://${domain}/`} target="_blank">
                {domain}
              </a>{" "}
              <button
                class="delete"
                onClick={() => {
                  if (window.confirm("Are you sure?"))
                    sendUpdate(["s", site.id || 0, "d", domain]);
                }}
              >
                ✕ unmap
              </button>
              {hasCertError && (
                <div class="cert-error">
                  {certStatus.paused ? (
                    <>
                      ⚠ Certificate issuance paused after {certStatus.failures}{" "}
                      failures
                      <br />
                      Last error: {certStatus.lastErr}
                    </>
                  ) : (
                    <>
                      ⚠ Certificate error ({certStatus.failures} failure
                      {certStatus.failures !== 1 ? "s" : ""})
                      <br />
                      {certStatus.lastErr}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  return (
    <>
      {list}
      <EditableText
        buttonText="add"
        buttonIcon="+"
        submit={(v) => sendUpdate(["s", site.id || 0, "d", v], true)}
      />
    </>
  );
}

function TransferOwnership({ site }: { site: Site }) {
  const state = useContext(StateCtx).value;
  const teams = state.root.children?.get("t")?.children;
  if (teams === undefined) {
    return null;
  }
  const teamCount = teams.size || 0;
  if (teamCount < 2) {
    return null;
  }
  const teamIDs = Array.from(teams.keys());
  teamIDs.sort((a, b) => a - b);
  return (
    <>
      Belongs to team{" "}
      <select
        onChange={(e) => {
          const target = e.target as HTMLSelectElement;
          sendUpdate(["s", site.id || 0, "t", Number(target.value)]);
          target.value = String(site.teamID || 0);
        }}
      >
        {teamIDs.map((teamID) => {
          const team = teams.get(teamID)?.value as Team;
          if (team === undefined) {
            return;
          }
          const selected = site.teamID === team.id;
          return (
            <option key={teamID} value={teamID} selected={selected}>
              #{team.id}: {team.name || <em>unnamed</em>}
            </option>
          );
        })}
      </select>
    </>
  );
}

function SiteAdminBody({ site }: { site: Site }) {
  const state = useContext(StateCtx).value;
  const siteID = site.id || 0;
  const teamID = site.teamID || 0;
  const team = loadTeam(state, teamID);
  const launchIDs = [...(site.launches?.keys() || [])];
  launchIDs.sort((a, b) => b - a);
  const uploadIDs = [...(site.uploads?.keys() || [])];
  uploadIDs.sort((a, b) => b - a);
  const latestLaunch = loadLaunch(state, site.id, launchIDs[0]);

  const deployedBundleID = loadUpload(
    state,
    site.id,
    latestLaunch?.uploadID,
  )?.bundle;
  return (
    <>
      <div class="breadcrumb">
        <Link href="/admin">← Admin</Link>
        <span> / </span>
        <Link href={`/admin/team/${teamID}`}>
          Team #{teamID}: {team?.name || <em>unnamed</em>}
        </Link>
      </div>
      <h1>
        <span class="icon">🌐</span>Site #{siteID}:{" "}
        <EditableText
          value={site.name}
          whenMissing="unnamed"
          buttonText="rename"
          submit={(v) => sendUpdate(["s", siteID], new Map([[1, v]]))}
        />
        <button
          class="delete"
          onClick={() => {
            if (window.confirm("Are you sure?")) sendUpdate(["s", siteID]);
          }}
        >
          ✕ destroy
        </button>
      </h1>
      <section>
        <h2>
          <span class="icon">🏭</span>Team
        </h2>
        <TransferOwnership site={site} />
      </section>
      <section>
        <h2>
          <span class="icon">⚙️</span>Settings
        </h2>
        <SettingsView value={site.settings} updateKey={["s", siteID, "s"]} />
      </section>
      <section>
        <h2>
          <span class="icon">🔗</span>Domains
        </h2>
        <DomainsView site={site} />
      </section>
      <section>
        <h2>
          <span class="icon">📤</span>Uploads
        </h2>
        <UploadList
          site={site}
          uploadIDs={uploadIDs}
          deployedBundleID={deployedBundleID}
        />
      </section>
      <section>
        <h2>
          <span class="icon">🚀</span>Launches
        </h2>
        <LaunchList
          site={site}
          launchIDs={launchIDs}
          deployedBundleID={deployedBundleID}
        />
      </section>
    </>
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
      <main>
        {!ready ? (
          <h1>Loading…</h1>
        ) : (
          site !== undefined && <SiteAdminBody site={site} />
        )}
      </main>
      <Footer />
    </div>
  );
}
