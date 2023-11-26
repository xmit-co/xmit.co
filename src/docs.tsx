import { Header } from "./header.tsx";
import { loadSession, StateCtx } from "./app.tsx";
import { useContext } from "preact/hooks";
import { Footer } from "./footer.tsx";

function CopiableCode({ children }: { children: string }) {
  return (
    <code
      class="clickable"
      onClick={() => {
        navigator.clipboard.writeText(children);
      }}
    >
      {children}
      <button>📋</button>
    </code>
  );
}

export function Docs() {
  const state = useContext(StateCtx);
  const session = loadSession(state.value);
  return (
    <div class="with-header">
      <Header session={session} />
      <div className="body docs">
        <div className="section">
          <h2>
            <span className="icon">📇</span>Configure DNS
          </h2>
          <p>Assuming your team number is 42:</p>
          <ul>
            <li>
              Point your domains to our services by creating CNAMEs like:
              <pre>{"@ CNAME 42.xmit.co.\n* CNAME 42.xmit.co."}</pre>
              (we need a <code>*</code> or <code>www</code> record for any
              domain that doesn't start with <code>www</code>)
            </li>
            <li>
              If you use a CDN, also create <code>@ TXT "xmit=42"</code>.
            </li>
          </ul>
        </div>
        <div className="section">
          <h2>
            <span className="icon">📥</span>Install <code>xmit</code>
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
        <div className="section">
          <h2>
            <span className="icon">🔑</span>Set your API key
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
        <div className="section">
          <h2>
            <span className="icon">1️⃣</span>Single Page Applications
          </h2>
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
            Create in the uploaded directory a file called{" "}
            <code>xmit.toml</code> with:
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
          <pre>{'[headers]\naccess-control-allow-origin = "*"'}</pre>
        </div>
      </div>
      <Footer />
    </div>
  );
}
