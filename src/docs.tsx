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
      <div class="body docs">
        <div class="section">
          <h2>
            <span class="icon">ℹ️</span>Guides available
          </h2>
          <p>
            This documentation is purposefully concise. We publish guides on{" "}
            <a href="https://xmit.dev/" target="_blank">
              our blog
            </a>
            .
          </p>
        </div>
        <div class="section" id="team">
          <h2>
            <span class="icon">🏭</span>Create or join a team
          </h2>
          <p>
            Domains are tied to sites which belong to teams. Start by creating
            or joining a team from the <Link href="/admin">admin page</Link>,
            and note its number.
          </p>
        </div>
        <div class="section" id="dns">
          <h2>
            <span class="icon">📇</span>Configure DNS
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
        <div class="section">
          <h2>
            <span class="icon">📥</span>Install <code>xmit</code>
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
        <div class="section" id="api">
          <h2>
            <span class="icon">🔑</span>Set an API key
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
        <div class="section">
          <h2>
            <span class="icon">📦</span>Upload your site
          </h2>
          <p>
            You've already <a href="#team">created or joined a team</a>,{" "}
            <a href="#api">configured an API key</a>, and either deploy to a
            subdomain of <code>xmit.dev</code> or <code>madethis.site</code>, or{" "}
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
        <div class="section">
          <h2>
            <span class="icon">1️⃣</span>Single Page Applications
          </h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with:
          </p>
          <pre>fallback = "index.html"</pre>
        </div>
        <div class="section">
          <h2>
            <span class="icon">😔</span>Custom 404
          </h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with:
          </p>
          <pre>404 = "404.html"</pre>
        </div>
        <div class="section">
          <h2>
            <span class="icon">🏷️</span>Custom headers
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
        <div class="section">
          <h2>
            <span class="icon">↪️</span>Redirects
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
      </div>
      <Footer />
    </div>
  );
}
