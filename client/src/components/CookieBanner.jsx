import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cookieBannerText } from "../legalLoader";

const ACK_KEY = "fmt_cookie_ack";

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until checked, avoids a flash

  useEffect(() => {
    setDismissed(localStorage.getItem(ACK_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const lang = navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
  const t = cookieBannerText[lang];

  function dismiss() {
    localStorage.setItem(ACK_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <p>
        {t.body} <Link to="/privacy">{t.linkLabel}</Link>.
      </p>
      <button className="secondary" onClick={dismiss}>
        {t.button}
      </button>
    </div>
  );
}
