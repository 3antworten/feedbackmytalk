import logo from "../assets/logo.png";

// Full logo lockup used as the page heading on auth/join screens.
export default function PageLogo() {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <img src={logo} alt="Feedback My Talk" className="page-logo" />
    </div>
  );
}
