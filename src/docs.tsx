import { Header } from "./header.tsx";
import { loadSession, logError, StateCtx } from "./app.tsx";
import { useContext } from "preact/hooks";
import { Footer } from "./footer.tsx";

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
            <span class="icon">📇</span>Configure DNS
          </h2>
          <p>Assuming your team number is 42:</p>
          <ul>
            <li>
              Point your domains to our services by creating CNAME/ALIAS records
              for both the domain(s) and its/their <code>www</code>{" "}
              subdomain(s), like:
              <pre>{"@ CNAME 42.xmit.co.\n* CNAME 42.xmit.co."}</pre>
              (we need a <code>*</code> or <code>www</code> record for any
              domain that doesn't start with <code>www</code>);
            </li>
            <li>
              If you use a CDN or created ALIAS records, create{" "}
              <code>@ TXT "xmit=42"</code>.
            </li>
          </ul>
        </div>
        <div class="section">
          <h2>
            <span class="icon">📥</span>Install <code>xmit</code>
          </h2>
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
              like this example:
              <pre>
                {
                  '{\n  "scripts": {\n    "deploy":  "tsc && vite build && xmit example.com"\n  }\n}'
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
        </div>
        <div class="section">
          <h2>
            <span class="icon">🔑</span>Set your API key
          </h2>
          <p>
            For developer machines, create an API key for your user and store it
            with <code>xmit set-key</code>.
          </p>
          <p>
            In shared environments like CI, create an API key for your team and
            set the environment variable <code>XMIT_KEY</code>.
          </p>
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
            Create in the uploaded directory a file called{" "}
            <code>xmit.toml</code> with:
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
              '[[headers]] # cache assets for a year\nname = "cache-control"\nvalue = "public, max-age=31536000"\non = "/assets/.*"\n\n[[headers]] # add CORS\nname = "access-control-allow-origin"\nvalue = "*"\n\n[[headers]] # unset referrer-policy\nname = "referrer-policy"'
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
              '[[redirects]]\nfrom = "/login"\nto = "https://login.acme.com"\n\n[[redirects]]\nfrom = "/new/(.*)"\nto = "/$1"\npermanent = true'
            }
          </pre>
        </div>
      </div>
      <Footer />
    </div>
  );
}
