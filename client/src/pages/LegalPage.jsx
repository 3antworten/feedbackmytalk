import { marked } from "marked";
import { Link } from "react-router-dom";
import PageLogo from "../components/PageLogo";

// Shared renderer for the imprint/privacy pages — both are long markdown documents resolved
// via legalLoader.js (real operator content if configured, else a generic placeholder).
export default function LegalPage({ markdown }) {
  const html = marked.parse(markdown);
  return (
    <div className="container">
      <p>
        <Link to="/">← Back</Link>
      </p>
      <PageLogo />
      {/* eslint-disable-next-line react/no-danger -- static, developer-authored legal copy, not user input */}
      <div className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
