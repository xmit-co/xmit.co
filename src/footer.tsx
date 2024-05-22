import { Link } from "preact-router/match";

export function Footer() {
  return (
    <footer>
      <p>
        <a href="mailto:help@xmit.dev">Reach out</a> for help, suggestions, GDPR
        requests &amp; abuse reports.
      </p>
      <p>Running from the European Union on renewable energy.</p>
      <p>
        <a href="https://xmit.instatus.com/" target="_blank">
          Status
        </a>{" "}
        |{" "}
        <a href="https://xmit.dev" target="_blank">
          Blog
        </a>{" "}
        |{" "}
        <a href="https://trello.com/b/5mtTbTW4/xmit" target="_blank">
          Trello
        </a>{" "}
        |{" "}
        <a href="https://discord.gg/EThbKNZDrP" target="_blank">
          Discord
        </a>{" "}
        | <Link href="/debug">Debug</Link>
      </p>
    </footer>
  );
}
