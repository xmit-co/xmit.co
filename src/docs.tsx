import { Header } from "./header.tsx";

export function Docs() {
  return (
    <div class="with-header">
      <Header />
      <div className="body docs">
        <div className="section">
          <h2>
            📥 Install <code>xmit</code>
          </h2>
          <h3>Go developers</h3>
          <ul>
            <li>
              Install with{" "}
              <code>go install github.com/xmit-co/xmit@latest</code>;
            </li>
            <li>
              Make sure your <code>PATH</code> includes{" "}
              <code>$(go env GOPATH)/bin</code>.
            </li>
          </ul>
          <h3>On Mac</h3>
          <ul>
            <li>
              Install <a href="https://brew.sh/">brew</a> if you haven't
              already;
            </li>
            <li>
              Run <code>brew install xmit-co/tap/xmit</code>.
            </li>
          </ul>
          <h3>On Windows and Linux</h3>
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
          <h2>🔑 Set your API key</h2>
          <p>
            For developer machines, create an API key for your user and store it
            with <code>xmit set-key</code>.
          </p>
          <p>
            In shared environments like automation, create an API key for your
            team and set the environment variable <code>XMIT_KEY</code>.
          </p>
        </div>
        <div className="section">
          <h2>📇 Configure DNS</h2>
          <p>Assuming your team number is 42:</p>
          <ul>
            <li>
              Point your domain(s) to our services by creating a{" "}
              <code>CNAME 42.xmit.co</code>;
            </li>
            <li>
              If you use a CDN, create a <code>TXT "xmit=42"</code>.
            </li>
          </ul>
        </div>
        <div className="section">
          <h2>1️⃣ Single Page Applications</h2>
          <p>
            Create in the uploaded directory (in <code>public</code> for Vite) a
            file called <code>xmit.toml</code> with:
          </p>
          <pre>fallback = "index.html"</pre>
        </div>
        <div className="section">
          <h2>😔 Custom 404</h2>
          <p>
            Create in the uploaded directory a file called{" "}
            <code>xmit.toml</code> with:
          </p>
          <pre>404 = "404.html"</pre>
        </div>
      </div>
    </div>
  );
}
