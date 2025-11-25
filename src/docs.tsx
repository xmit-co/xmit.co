import { Header } from "./header.tsx";
import { loadSession, loadTeam, loadUser, logError, StateCtx } from "./app.tsx";
import { useContext, useState, useEffect } from "preact/hooks";
import { Footer } from "./footer.tsx";
import { Link } from "preact-router/match";
import tlds from "tlds";

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

export function Docs() {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  const user = uid !== undefined ? loadUser(state, uid) : undefined;
  const teamIDs = user?.teams ? Array.from(user.teams.keys()) : [];
  const [selectedTeamID, setSelectedTeamID] = useState<number | undefined>(
    teamIDs.length > 0 ? teamIDs[0] : undefined,
  );
  const [installTab, setInstallTab] = useState<string>("brew");
  const [configTab, setConfigTab] = useState<string>("spa");
  const [domain, setDomain] = useState<string>("");

  // Update selectedTeamID when user signs in and teams become available
  useEffect(() => {
    if (teamIDs.length > 0 && selectedTeamID === undefined) {
      setSelectedTeamID(teamIDs[0]);
    }
  }, [teamIDs, selectedTeamID]);

  // Check if we're still loading (state not ready yet)
  const isLoading = !state.ready;

  const teamNumber = selectedTeamID || 42;

  // Parse domain to determine DNS instructions
  const trimmedDomain = domain.trim().toLowerCase();
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

  return (
    <div class="with-header">
      <Header session={session} />
      <main className="docs">
        <div className="section">
          <h2>
            <span className="icon">ℹ️</span>Guides available
          </h2>
          <p>
            This documentation is purposefully concise. We publish guides on{" "}
            <a href="https://xmit.dev/" target="_blank">
              our blog
            </a>
            .
          </p>
        </div>
        <div className="section" id="domain">
          <h2>
            <span className="icon">🌐</span>Choose a domain
          </h2>
          <p>
            You can deploy to any domain you own, or any subdomain of{" "}
            <code>xmit.dev</code> or <code>madethis.site</code>.
          </p>
          <p>
            This choice isn't final, as you can add and remove domains on sites
            when you want from their admin page.
          </p>
        </div>
        <div className="section" id="dns">
          <h2>
            <span className="icon">📇</span>Configure DNS
          </h2>
          {isLoading ? (
            <p>Loading…</p>
          ) : uid === undefined ? (
            <p>Please sign in or sign up to view instructions.</p>
          ) : (
            <>
              <p>
                {teamIDs.length > 0 && (
                  <>
                    Team:{" "}
                    <select
                      value={selectedTeamID}
                      onChange={(e) =>
                        setSelectedTeamID(
                          Number((e.target as HTMLSelectElement).value),
                        )
                      }
                      style={{ marginRight: "16px" }}
                    >
                      {teamIDs.map((teamID: number) => {
                        const team = loadTeam(state, teamID);
                        return (
                          <option key={teamID} value={teamID}>
                            #{teamID}: {team?.name || "Loading..."}
                          </option>
                        );
                      })}
                    </select>
                  </>
                )}
                Domain:{" "}
                <input
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onInput={(e) =>
                    setDomain((e.target as HTMLInputElement).value)
                  }
                  onChange={(e) =>
                    setDomain((e.target as HTMLInputElement).value)
                  }
                  onKeyUp={(e) =>
                    setDomain((e.target as HTMLInputElement).value)
                  }
                />
              </p>
              {trimmedDomain && canSkipDNS && (
                <p style={{ color: "#0a0" }}>
                  ✓ Domains ending in <code>.xmit.dev</code> or{" "}
                  <code>.madethis.site</code> don't require DNS configuration.
                  You can skip this section!
                </p>
              )}
              {trimmedDomain && !canSkipDNS && isZoneApex && (
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
              {trimmedDomain && !canSkipDNS && isWWW && (
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
              {trimmedDomain && !canSkipDNS && isSubdomain && (
                <>
                  <ul>
                    <li>
                      For the subdomain, create a <strong>CNAME</strong> record:
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
        <div className="section" id="onclebob">
          <h2>
            <span className="icon">🖥️</span>Use Oncle Bob
          </h2>
          <p>
            For those who prefer a graphical interface, download the app from{" "}
            <a href="https://onclebob.com/" target="_blank">
              onclebob.com
            </a>
            . This is an alternative to the command-line with a user-friendly
            interface. It also supports <code>xmit.toml</code> files described
            below; feel free to jump to{" "}
            <Link href="#config">configuration</Link>.
          </p>
        </div>
        <div className="section">
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
                  Run <CopiableCode>brew install xmit-co/tap/xmit</CopiableCode>
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
                  Place the <code>xmit</code> binary in your <code>PATH</code>.
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
                  <code>package.json</code> like this example where we first run
                  a build script:
                  <pre>
                    {
                      '{\n  "scripts": {\n    "deploy":  "npm run build && xmit example.com"\n  }\n}'
                    }
                  </pre>
                </li>
                <li>
                  Invoke it with <CopiableCode>npm run deploy</CopiableCode>.
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
            For developer machines, create an API key for your user and store it
            with <code>xmit set-key</code>. Pass it as argument, or enter it
            interactively to keep it out of your shell history and terminal
            output.
          </p>
          <p>
            In shared environments like CI, create an API key for your team and
            set the environment variable <code>XMIT_KEY</code>.
          </p>
        </div>
        <div className="section">
          <h2>
            <span className="icon">📦</span>Upload your site
          </h2>
          <p>
            You've already <a href="#api">provisioned an API key</a> and{" "}
            <a href="#dns">configured DNS</a>.
          </p>
          <ul>
            <li>
              Upload your project with <code>xmit my.example.com</code> in the
              root of your site hierarchy (or, if it's called <code>dist</code>,
              its parent directory). Alternatively, to specify a directory, pass
              a second argument, like <code>xmit my.example.com example/</code>.
            </li>
            <li>
              By default, uploads are launched automatically; if you've turned
              that off, visit your site's admin page to launch the upload.
            </li>
          </ul>
        </div>
        <div className="section" id="config">
          <h2>
            <span className="icon">⚙️</span>Configure with{" "}
            <code>xmit.toml</code>
          </h2>
          <p>
            Create a file called <code>xmit.toml</code> in the uploaded
            directory (in <code>public</code> for Vite) to configure your site's
            behavior.
          </p>
          <div className="tabs">
            <button
              className={configTab === "spa" ? "active" : ""}
              onClick={() => setConfigTab("spa")}
            >
              SPA
            </button>
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
                <pre>fallback = "index.html"</pre>
              </>
            )}
            {configTab === "404" && (
              <>
                <p>It should contain, for example:</p>
                <pre>404 = "404.html"</pre>
              </>
            )}
            {configTab === "headers" && (
              <>
                <p>It should contain, for example:</p>
                <pre>
                  {
                    '[[headers]] # cache assets for a year\nname = "cache-control"\nvalue = "public, max-age=31536000"\non = "^/assets/"\n\n[[headers]] # add CORS\nname = "access-control-allow-origin"\nvalue = "*"\n\n[[headers]] # unset referrer-policy\nname = "referrer-policy"'
                  }
                </pre>
              </>
            )}
            {configTab === "redirects" && (
              <>
                <p>It should contain, for example:</p>
                <pre>
                  {
                    '[[redirects]]\nfrom = "^/login$"\nto = "https://login.acme.com"\n\n[[redirects]]\nfrom = "^/new/(.*)"\nto = "/$1"\npermanent = true'
                  }
                </pre>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
