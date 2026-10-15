import type { Metadata } from "next";

import { PublicReceptionDemo } from "@/components/public-reception-demo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Try Caléonis Receptionist" : "Essayer Caléonis Receptionist",
    description: locale === "en" ? "Try the Caléonis Receptionist AI receptionist directly in your browser." : "Testez la réceptionniste IA Caléonis Receptionist directement depuis votre navigateur.",
    robots: { index: false, follow: false },
  };
}

export default function ReceptionDemoPage() {
  return <PublicReceptionDemo />;
}
