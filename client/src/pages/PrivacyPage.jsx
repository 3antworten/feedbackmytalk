import LegalPage from "./LegalPage";
import { privacyMd } from "../legalLoader";

export default function PrivacyPage() {
  return <LegalPage markdown={privacyMd} />;
}
