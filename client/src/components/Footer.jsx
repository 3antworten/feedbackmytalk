import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/imprint">Imprint</Link>
      </nav>
    </footer>
  );
}
