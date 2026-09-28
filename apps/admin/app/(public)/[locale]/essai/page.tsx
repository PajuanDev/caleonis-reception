import type { Metadata } from "next";

import { PublicReceptionDemo } from "@/components/public-reception-demo";

export const metadata: Metadata = {
  title: "Essayer Caleonis Reception",
  description: "Testez la réceptionniste IA Caleonis Reception directement depuis votre navigateur.",
  robots: { index: false, follow: false },
};

export default function ReceptionDemoPage() {
  return <PublicReceptionDemo />;
}
