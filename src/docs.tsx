import { Header } from "./header.tsx";
import { loadSession, loadTeam, loadUser, logError, StateCtx } from "./app.tsx";
import { useContext, useState, useEffect, useRef } from "preact/hooks";
import { Footer } from "./footer.tsx";
import { Link } from "preact-router/match";
import tlds from "tlds";
import { DomainChecker, useDomainChecker } from "./domainChecker.tsx";

function CopiableCode({ children }: { children: string }) {
  return (
    <code
      class="clickable"
      onClick={() => navigator.clipboard.writeText(children).catch(logError)}
    >
      {children}
      <button>📋</button>
    </code>
  );
}

function getInitialParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    domain: params.get("domain") || "",
    team: params.get("team") ? Number(params.get("team")) : undefined,
    deploy: (params.get("deploy") as "onclebob" | "cli") || "onclebob",
    install: params.get("install") || "brew",
    configTab: params.get("configTab") || "404",
    configFormat: (params.get("configFormat") as "toml" | "json5") || "toml",
  };
}

export function Docs() {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  const user = uid !== undefined ? loadUser(state, uid) : undefined;
  const teamIDs = user?.teams ? Array.from(user.teams.keys()) : [];
  teamIDs.sort((a, b) => b - a);

  const initialParams = useRef(getInitialParams());
  const [selectedTeamID, setSelectedTeamID] = useState<number | undefined>(
    initialParams.current.team,
  );
  const [installTab, setInstallTab] = useState<string>(
    initialParams.current.install,
  );
  const [configTab, setConfigTab] = useState<string>(
    initialParams.current.configTab,
  );
  const [configFormat, setConfigFormat] = useState<"toml" | "json5">(
    initialParams.current.configFormat,
  );
  const [deployMethod, setDeployMethod] = useState<"onclebob" | "cli">(
    initialParams.current.deploy,
  );
  const domainState = useDomainChecker();

  // Pre-fill domain from URL params
  useEffect(() => {
    const domainParam = initialParams.current.domain;
    if (domainParam) {
      const trimmed = domainParam.trim().toLowerCase();
      if (trimmed.endsWith(".xmit.dev") || trimmed.endsWith(".madethis.site")) {
        domainState.setDomainMode("preset");
        domainState.setPresetDomain(trimmed);
      } else {
        domainState.setDomainMode("custom");
        domainState.setDomain(trimmed);
      }
    }
  }, []);

  // Auto-select first team when teams become available (only if not set from URL)
  useEffect(() => {
    if (teamIDs.length > 0 && selectedTeamID === undefined) {
      // Check if URL had a team param that matches available teams
      const urlTeam = initialParams.current.team;
      if (urlTeam !== undefined && teamIDs.includes(urlTeam)) {
        setSelectedTeamID(urlTeam);
      } else {
        setSelectedTeamID(teamIDs[0]);
      }
    }
  }, [teamIDs.length, selectedTeamID]);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (domainState.trimmedDomain) {
      params.set("domain", domainState.trimmedDomain);
    }
    if (selectedTeamID !== undefined) {
      params.set("team", String(selectedTeamID));
    }
    if (deployMethod !== "onclebob") {
      params.set("deploy", deployMethod);
    }
    if (deployMethod === "cli" && installTab !== "brew") {
      params.set("install", installTab);
    }
    if (configTab !== "404") {
      params.set("configTab", configTab);
    }
    if (configFormat !== "toml") {
      params.set("configFormat", configFormat);
    }
    const search = params.toString();
    const newUrl = search ? `?${search}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [
    domainState.trimmedDomain,
    selectedTeamID,
    deployMethod,
    installTab,
    configTab,
    configFormat,
  ]);

  // Check if we're still loading (state not ready yet)
  const isLoading = !state.ready;

  const teamNumber = selectedTeamID || 42;

  // Parse domain to determine DNS instructions
  const { trimmedDomain, domainMode } = domainState;
  const canSkipDNS =
    trimmedDomain.endsWith(".xmit.dev") ||
    trimmedDomain.endsWith(".madethis.site");
  const parts = trimmedDomain.split(".");

  // Find matching TLD by checking all possible suffixes (longest first)
  let matchedTld = null;
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(-i).join(".");
    if (tlds.includes(suffix)) {
      matchedTld = suffix;
    }
  }

  // Determine if this is a zone apex (root domain) or subdomain
  const tldPartCount = matchedTld ? matchedTld.split(".").length : 1;
  const minPartsForApex = tldPartCount + 1; // domain + TLD (e.g., "pcarrier" + "co.uk" = 2 parts)
  const isZoneApex =
    parts.length === minPartsForApex && trimmedDomain.length > 0;
  // isWWW is true for any domain starting with www.
  const isWWW = trimmedDomain.startsWith("www.");
  const isSubdomain = parts.length > minPartsForApex && !isWWW;
  // For subdomains, extract everything before the root domain (e.g., "hello.foo" from "hello.foo.pcarrier.co.uk")
  const subdomainName = isSubdomain
    ? parts.slice(0, parts.length - minPartsForApex).join(".")
    : "";
  const wwwSubdomainName = isWWW
    ? parts.slice(0, parts.length - minPartsForApex).join(".")
    : "";
  const note = (
    <p>
      If you intend to deploy multiple sites on subdomains, you can use instead:
      <pre>
        {isZoneApex && `@ ALIAS ${teamNumber}.xmit.co.\n`}
        {`* CNAME ${teamNumber}.xmit.co.\n@ TXT "xmit=${teamNumber}"`}
      </pre>
    </p>
  );

  // Format xmit command based on domain and team
  const xmitCommand = trimmedDomain
    ? canSkipDNS
      ? `xmit ${trimmedDomain}@${teamNumber}`
      : `xmit ${trimmedDomain}`
    : "";

  return (
    <div class="with-header">
      <Header session={session} />
      <main className="docs">
        <h1>
          <span className="icon">📚</span>Documentation
        </h1>
        <p>
          We also publish guides on{" "}
          <a href="https://xmit.dev/" target="_blank">
            our blog
          </a>
          .
        </p>
        {isLoading ? (
          <div className="section">
            <p>Loading…</p>
          </div>
        ) : uid === undefined ? (
          <div className="section">
            <p>
              Please sign up or sign in to view all instructions, tailored to
              your situation.
            </p>
          </div>
        ) : (
          <>
            <div className="section">
              <h2>
                <span className="icon">🌐</span>Choose a domain
              </h2>
              <DomainChecker state={domainState} />
            </div>
            <div className="section">
              <h2>
                <span className="icon">👥</span>Choose a team
              </h2>
              {teamIDs.length > 0 ? (
                <>
                  {teamIDs.map((teamID: number) => {
                    const team = loadTeam(state, teamID);
                    return (
                      <p key={teamID}>
                        <label>
                          <input
                            type="radio"
                            name="team"
                            value={teamID}
                            checked={selectedTeamID === teamID}
                            onChange={() => setSelectedTeamID(teamID)}
                          />{" "}
                          #{teamID}
                          {team?.name ? `: ${team.name}` : ""}
                        </label>
                      </p>
                    );
                  })}
                  <p>
                    <Link href="/admin">Manage teams</Link>.
                  </p>
                </>
              ) : (
                <p>
                  You don't have any teams yet.{" "}
                  <Link href="/admin">Manage teams</Link>.
                </p>
              )}
            </div>
          </>
        )}
        {domainMode === "custom" && (
          <div className="section" id="dns">
            <h2>
              <span className="icon">📇</span>Configure DNS
            </h2>
            {isLoading ? (
              <p>Loading…</p>
            ) : uid === undefined ? (
              <p>Please sign up or sign in to view all instructions.</p>
            ) : (
              <>
                {!trimmedDomain && (
                  <p>
                    Enter a domain above to see DNS configuration instructions.
                  </p>
                )}
                {trimmedDomain && isZoneApex && (
                  <>
                    <ul>
                      <li>
                        For the zone apex, create an <strong>ALIAS</strong> or{" "}
                        <strong>ANAME</strong> record:
                        <pre>{`@ ALIAS ${teamNumber}.xmit.co.`}</pre>
                      </li>
                      <li>
                        For its <code>www</code> subdomain, create a{" "}
                        <strong>CNAME</strong> record:
                        <pre>{`www CNAME ${teamNumber}.xmit.co.`}</pre>
                      </li>
                      <li>
                        Create a <strong>TXT</strong> record to establish
                        ownership:
                        <pre>{`@ TXT "xmit=${teamNumber}"`}</pre>
                      </li>
                    </ul>
                    {note}
                  </>
                )}
                {trimmedDomain && isWWW && (
                  <>
                    <ul>
                      <li>
                        Create a <strong>CNAME</strong> record:
                        <pre>{`${wwwSubdomainName} CNAME ${teamNumber}.xmit.co.`}</pre>
                      </li>
                      <li>
                        Create a <strong>TXT</strong> record to establish
                        ownership:
                        <pre>{`${wwwSubdomainName} TXT "xmit=${teamNumber}"`}</pre>
                      </li>
                    </ul>
                    {note}
                  </>
                )}
                {trimmedDomain && isSubdomain && (
                  <>
                    <ul>
                      <li>
                        For the subdomain, create a <strong>CNAME</strong>{" "}
                        record:
                        <pre>{`${subdomainName} CNAME ${teamNumber}.xmit.co.`}</pre>
                      </li>
                      <li>
                        For its <code>www</code> subdomain, create a{" "}
                        <strong>CNAME</strong> record:
                        <pre>{`www.${subdomainName} CNAME ${teamNumber}.xmit.co.`}</pre>
                      </li>
                      <li>
                        Create a <strong>TXT</strong> record to establish
                        ownership:
                        <pre>{`${subdomainName} TXT "xmit=${teamNumber}"`}</pre>
                      </li>
                    </ul>
                    {note}
                  </>
                )}
              </>
            )}
          </div>
        )}
        <div className="section">
          <h2>
            <span className="icon">🚀</span>Launch
          </h2>
          <p>Choose your preferred method:</p>
          <div style={{ display: "flex", gap: "1em", marginTop: "1em" }}>
            <div
              style={{
                flex: 1,
                padding: "1em",
                backgroundColor: deployMethod === "onclebob" ? "#222" : "#111",
                borderRadius: "0.5em",
                border:
                  deployMethod === "onclebob"
                    ? "2px solid #ff0"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
              onClick={() => setDeployMethod("onclebob")}
            >
              <h3 style={{ marginTop: 0 }}>🖥️ Oncle Bob (GUI)</h3>
              <p>For those who prefer a graphical interface.</p>
              {deployMethod === "onclebob" && (
                <p>
                  <a href="https://onclebob.com/" target="_blank">
                    <button>Download Oncle Bob</button>
                  </a>
                </p>
              )}
            </div>
            <div
              style={{
                flex: 1,
                padding: "1em",
                backgroundColor: deployMethod === "cli" ? "#222" : "#111",
                borderRadius: "0.5em",
                border:
                  deployMethod === "cli"
                    ? "2px solid #ff0"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
              onClick={() => setDeployMethod("cli")}
            >
              <h3 style={{ marginTop: 0 }}>⌨️ Command Line (CLI)</h3>
              <p>For those who prefer the terminal and/or CI/CD.</p>
            </div>
          </div>
        </div>
        {deployMethod === "cli" && (
          <>
            <div className="section" id="install">
              <h2>
                <span className="icon">📥</span>Install <code>xmit</code>
              </h2>
              <div className="tabs">
                <button
                  className={installTab === "brew" ? "active" : ""}
                  onClick={() => setInstallTab("brew")}
                >
                  brew (Mac)
                </button>
                <button
                  className={installTab === "go" ? "active" : ""}
                  onClick={() => setInstallTab("go")}
                >
                  go
                </button>
                <button
                  className={installTab === "npm-project" ? "active" : ""}
                  onClick={() => setInstallTab("npm-project")}
                >
                  npm (in your project)
                </button>
                <button
                  className={installTab === "npm-global" ? "active" : ""}
                  onClick={() => setInstallTab("npm-global")}
                >
                  npm (global)
                </button>
                <button
                  className={installTab === "archive" ? "active" : ""}
                  onClick={() => setInstallTab("archive")}
                >
                  archive
                </button>
              </div>
              <div className="tab-content">
                {installTab === "brew" && (
                  <ul>
                    <li>
                      Install <a href="https://brew.sh/">brew</a> if you haven't
                      already;
                    </li>
                    <li>
                      Run{" "}
                      <CopiableCode>brew install xmit-co/tap/xmit</CopiableCode>
                      .
                    </li>
                  </ul>
                )}
                {installTab === "go" && (
                  <ul>
                    <li>
                      Install with{" "}
                      <CopiableCode>
                        go install github.com/xmit-co/xmit@latest
                      </CopiableCode>
                      ;
                    </li>
                    <li>
                      Make sure your <code>PATH</code> includes{" "}
                      <code>$(go env GOPATH)/bin</code>.
                    </li>
                  </ul>
                )}
                {installTab === "archive" && (
                  <ul>
                    <li>
                      Download from the{" "}
                      <a href="https://github.com/xmit-co/xmit/releases/latest">
                        latest release
                      </a>
                      ;
                    </li>
                    <li>
                      Place the <code>xmit</code> binary in your{" "}
                      <code>PATH</code>.
                    </li>
                  </ul>
                )}
                {installTab === "npm-project" && (
                  <ul>
                    <li>
                      Add a dependency with{" "}
                      <CopiableCode>
                        npm install --save-dev @xmit.co/xmit
                      </CopiableCode>
                      ;
                    </li>
                    <li>
                      Create a <code>deploy</code> script in{" "}
                      <code>package.json</code> like this example where we first
                      run a build script:
                      <pre>
                        {xmitCommand
                          ? `{\n  "scripts": {\n    "deploy":  "npm run build && ${xmitCommand}"\n  }\n}`
                          : '{\n  "scripts": {\n    "deploy":  "npm run build && xmit example.com"\n  }\n}'}
                      </pre>
                    </li>
                    <li>
                      Invoke it with <CopiableCode>npm run deploy</CopiableCode>
                      .
                    </li>
                  </ul>
                )}
                {installTab === "npm-global" && (
                  <p>
                    Invoke with <CopiableCode>npx @xmit.co/xmit</CopiableCode>.
                  </p>
                )}
              </div>
            </div>
            <div className="section" id="api">
              <h2>
                <span className="icon">🔑</span>Set an API key
              </h2>
              <p>
                Keys are provisioned for users or teams from the{" "}
                <Link href="/admin">admin page</Link>. User keys have the same
                rights as team keys in all teams a user belongs to.
              </p>
              <p>
                For developer machines, create an API key for your user and
                store it with <CopiableCode>xmit set-key</CopiableCode>. Pass it
                as argument, or enter it interactively to keep it out of your
                shell history and terminal output.
              </p>
              <p>
                In shared environments like CI, create an API key for your team
                and set the environment variable <code>XMIT_KEY</code>.
              </p>
            </div>
            <div className="section" id="upload">
              <h2>
                <span className="icon">📦</span>Upload your site
              </h2>
              <p>
                You've already <a href="#api">provisioned an API key</a>
                {trimmedDomain && !canSkipDNS && (
                  <>
                    {" "}
                    and <a href="#dns">configured DNS</a>
                  </>
                )}
                .
              </p>
              <ul>
                <li>
                  Upload your project with{" "}
                  {xmitCommand ? (
                    <CopiableCode>{xmitCommand}</CopiableCode>
                  ) : (
                    <CopiableCode>xmit example.com</CopiableCode>
                  )}{" "}
                  in the root of your site hierarchy (or, if it's called{" "}
                  <code>dist</code>, its parent directory). Alternatively, to
                  specify a directory, pass a second argument, like{" "}
                  <code>example/</code>.
                </li>
                <li>
                  By default, uploads are launched automatically; if you've
                  turned that off, visit your site's admin page to launch the
                  upload.
                </li>
              </ul>
            </div>
          </>
        )}
        <div className="section" id="config">
          <h2>
            <span className="icon">⚙️</span>Optional configuration
          </h2>
          <p>
            Choose your preferred configuration format:{" "}
            <button
              className={configFormat === "toml" ? "active" : ""}
              onClick={() => setConfigFormat("toml")}
            >
              TOML
            </button>
            <button
              className={configFormat === "json5" ? "active" : ""}
              onClick={() => setConfigFormat("json5")}
            >
              JSON5
            </button>
          </p>
          <p>
            Create a file called{" "}
            <code>{configFormat === "toml" ? "xmit.toml" : "xmit.json"}</code>{" "}
            in the uploaded directory (in <code>public</code> for Vite) to
            configure your site's behavior.
          </p>
          {configFormat === "json5" ? (
            <p>
              The format is{" "}
              <a href="https://json5.org/" target="_blank">
                JSON5
              </a>
              , which supports comments, trailing commas, single-quoted strings,
              and unquoted keys.
            </p>
          ) : (
            <p>
              Learn more about{" "}
              <a href="https://toml.io/" target="_blank">
                TOML syntax
              </a>
              .
            </p>
          )}
          <div className="tabs">
            <button
              className={configTab === "404" ? "active" : ""}
              onClick={() => setConfigTab("404")}
            >
              Custom 404
            </button>
            <button
              className={configTab === "headers" ? "active" : ""}
              onClick={() => setConfigTab("headers")}
            >
              Custom headers
            </button>
            <button
              className={configTab === "redirects" ? "active" : ""}
              onClick={() => setConfigTab("redirects")}
            >
              Redirects
            </button>
            <button
              className={configTab === "spa" ? "active" : ""}
              onClick={() => setConfigTab("spa")}
            >
              SPA
            </button>
            <button
              className={configTab === "form2mail" ? "active" : ""}
              onClick={() => setConfigTab("form2mail")}
            >
              Form2Mail
            </button>
          </div>
          <div className="tab-content">
            {configTab === "spa" && (
              <>
                <p>
                  This setting is not for single page websites but specifically
                  single page applications, where you want any path that's not
                  backed by an asset to serve the same page. It should contain,
                  for example:
                </p>
                <pre>
                  {configFormat === "toml"
                    ? 'fallback = "index.html"'
                    : "{ fallback: 'index.html' }"}
                </pre>
              </>
            )}
            {configTab === "404" && (
              <>
                <p>It should contain, for example:</p>
                <pre>
                  {configFormat === "toml"
                    ? '404 = "404.html"'
                    : "{ '404': '404.html' }"}
                </pre>
              </>
            )}
            {configTab === "headers" && (
              <>
                <p>It should contain, for example:</p>
                <pre>
                  {configFormat === "toml"
                    ? '[[headers]] # cache assets for a year\nname = "cache-control"\nvalue = "public, max-age=31536000"\non = "^/assets/"\n\n[[headers]] # add CORS\nname = "access-control-allow-origin"\nvalue = "*"\n\n[[headers]] # unset referrer-policy\nname = "referrer-policy"'
                    : `{
  headers: [
    // cache assets for a year
    { name: 'cache-control', value: 'public, max-age=31536000', on: '^/assets/' },
    // add CORS
    { name: 'access-control-allow-origin', value: '*' },
    // unset referrer-policy
    { name: 'referrer-policy' },
  ],
}`}
                </pre>
              </>
            )}
            {configTab === "redirects" && (
              <>
                <p>It should contain, for example:</p>
                <pre>
                  {configFormat === "toml"
                    ? '[[redirects]]\nfrom = "^/login$"\nto = "https://login.acme.com"\n\n[[redirects]]\nfrom = "^/new/(.*)"\nto = "/$1"\npermanent = true'
                    : `{
  redirects: [
    { from: '^/login$', to: 'https://login.acme.com' },
    { from: '^/new/(.*)', to: '/$1', permanent: true },
  ],
}`}
                </pre>
              </>
            )}
            {configTab === "form2mail" && (
              <>
                <p>
                  Handle form submissions by email without backend code. It
                  should contain, for example:
                </p>
                <pre>
                  {configFormat === "toml"
                    ? '[[forms]]\nfrom = "/contact"\nto = "you@example.com"\nthen = "/thank-you"'
                    : `{
  forms: [
    { from: '/contact', to: 'you@example.com', then: '/thank-you' },
  ],
}`}
                </pre>
                <p>
                  Learn more about{" "}
                  <a
                    href="https://nothing.pcarrier.com/posts/form2mail/"
                    target="_blank"
                  >
                    form2mail configuration and usage
                  </a>
                  .
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
