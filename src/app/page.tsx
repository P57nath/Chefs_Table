import { brand } from "@/config/brand";

/** Minimal landing until the designed landing page lands in Phase 2. */
export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{brand.name}</h1>
      <p className="text-lg text-muted-foreground">{brand.tagline}</p>
      <p className="text-muted-foreground">Scan the QR code on your table to see the menu.</p>
    </main>
  );
}
