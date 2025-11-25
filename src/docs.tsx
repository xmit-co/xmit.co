import { Header } from "./header.tsx";
import { loadSession, logError, StateCtx } from "./app.tsx";
import { useContext } from "preact/hooks";
import { Footer } from "./footer.tsx";
import { Link } from "preact-router/match";

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
        <div className="section" id="team">
          <h2>
            <span className="icon">🏭</span>Create or join a team
          </h2>
          <p>
            Domains belong to sites which belong to teams. Every account starts with a default team.
            Pick one from the <Link href="/admin">admin page</Link>,
            and note its number.
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
          <p>
            You can skip this section to deploy to a subdomain of{" "}
            <code>xmit.dev</code> or <code>madethis.site</code>. Otherwise, if
            your domain will belong to team #42:
          </p>
          <ul>
            <li>
              Point your domains to our services by creating CNAME or, whenever
              not possible, ALIAS records for both the domain and its{" "}
              <code>www</code> subdomain, like:
              <pre>{"@ CNAME 42.xmit.co.\n* CNAME 42.xmit.co."}</pre>
              We need a <code>*</code> or <code>www</code> record for any domain
              that doesn't start with <code>www</code>.
            </li>
            <li>
              If you had to create an ALIAS record, or if you use the DNS
              servers of a CDN like Cloudflare, create a corresponding TXT
              record:
              <pre>@ TXT "xmit=42"</pre>
              This lets us establish ownership when we cannot read the team
              number otherwise.
            </li>
          </ul>
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
            . This is an alternative to the command-line with a user-friendly interface.
            It also supports <code>xmit.toml</code> files described below; feel free to jump to
            {' '}<Link href="#spa">Single Page Applications</Link>.
          </p>
        </div>
        <div className="section">
          <h2>
            <span className="icon">📥</span>Install <code>xmit</code>
          </h2>
          <p>Each situation is unique. Pick the most convenient solution.</p>
          <h3>
            with <code>brew</code> (Mac)
          </h3>
          <ul>
            <li>
              Install <a href="https://brew.sh/">brew</a> if you haven't
              already;
            </li>
            <li>
              Run <CopiableCode>brew install xmit-co/tap/xmit</CopiableCode>.
            </li>
          </ul>
          <h3>
            with <code>go</code>
          </h3>
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
          <h3>from an archive (Windows &amp; Linux)</h3>
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
          <h3>
            with <code>npm</code>
          </h3>
          <h4>in a project</h4>
          <ul>
            <li>
              Add a dependency with{" "}
              <CopiableCode>npm install --save-dev @xmit.co/xmit</CopiableCode>;
            </li>
            <li>
              Create a <code>deploy</code> script in <code>package.json</code>{" "}
              like this example where we first run a build script:
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
          <h4>globally</h4>
          <p>
            Invoke with <CopiableCode>npx @xmit.co/xmit</CopiableCode>.
          </p>
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
            You've already <a href="#api">configured an API key</a>, and either
            deploy to a subdomain of <code>xmit.dev</code> or <code>madethis.site</code>,
            or <a href="#dns">configured DNS</a>.
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
        <div className="section" id="spa">
          <h2>
            <span className="icon">1️⃣</span>Single Page Applications
          </h2>
          <p>
            This settings is not for single page websites but specifically
            single page applications, where you want any path that's not backed
            by an asset to serve the same page.
          </p>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with:
          </p>
          <pre>fallback = "index.html"</pre>
        </div>
        <div className="section">
          <h2>
            <span className="icon">😔</span>Custom 404
          </h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with:
          </p>
          <pre>404 = "404.html"</pre>
        </div>
        <div className="section">
          <h2>
            <span className="icon">🏷️</span>Custom headers
          </h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with, for example:
          </p>
          <pre>
            {
              '[[headers]] # cache assets for a year\nname = "cache-control"\nvalue = "public, max-age=31536000"\non = "^/assets/"\n\n[[headers]] # add CORS\nname = "access-control-allow-origin"\nvalue = "*"\n\n[[headers]] # unset referrer-policy\nname = "referrer-policy"'
            }
          </pre>
        </div>
        <div className="section">
          <h2>
            <span className="icon">↪️</span>Redirects
          </h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with, for example:
          </p>
          <pre>
            {
              '[[redirects]]\nfrom = "^/login$"\nto = "https://login.acme.com"\n\n[[redirects]]\nfrom = "^/new/(.*)"\nto = "/$1"\npermanent = true'
            }
          </pre>
        </div>
      </main>
      <Footer />
    </div>
  );
}
