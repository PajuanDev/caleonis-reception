import { LiveAffiliateSurface } from "@/components/live-affiliate-surface";
import { AffiliateUnavailableSurface } from "@/components/affiliate-unavailable-surface";
import { affiliateProgramEnabled } from "@/lib/affiliate-program";

export default function AffiliatePage() {
  return affiliateProgramEnabled() ? <LiveAffiliateSurface /> : <AffiliateUnavailableSurface />;
}
