import LegalPage from "./LegalPage";
import { imprintMd } from "../legalLoader";

export default function ImprintPage() {
  return <LegalPage markdown={imprintMd} />;
}
