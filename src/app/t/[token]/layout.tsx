import type { Metadata } from "next";

import { HeadScript } from "@/components/providers/head-script";
import { accentCss } from "@/config/accents";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { getTableInfo } from "@/features/guest/server/table-data";
import { InvalidQrScreen } from "@/features/guest/session/guest-screens";
import { GuestSessionProvider } from "@/features/guest/session/guest-session";
import { GuestShell } from "@/features/guest/session/guest-shell";
import { welcomeSeenScript } from "@/features/guest/session/welcome-key";
import { WelcomeOverlay } from "@/features/guest/session/welcome-overlay";

export async function generateMetadata({ params }: LayoutProps<"/t/[token]">): Promise<Metadata> {
  const info = await getTableInfo((await params).token);
  return {
    title: info ? { absolute: `${info.table_label} · ${info.restaurant_name}` } : undefined,
    robots: { index: false, follow: false },
  };
}

/** Guest shell: resolves the QR server-side, then providers + session bootstrap. */
export default async function GuestLayout({ children, params }: LayoutProps<"/t/[token]">) {
  const { token } = await params;
  const info = await getTableInfo(token);
  const accent = info ? accentCss(info.accent) : null;

  return (
    <SurfaceTheme surface="guest">
      {/* Brand accent preset chosen in Admin → Settings (static CSS from a fixed allow-list). */}
      {accent ? <style>{accent}</style> : null}
      {info ? (
        <GuestSessionProvider token={token} table={info}>
          {/* Hide the welcome overlay before paint if this tab already saw it. */}
          <HeadScript html={welcomeSeenScript(token)} />
          <WelcomeOverlay
            token={token}
            restaurantName={info.restaurant_name}
            tableLabel={info.table_label}
            logoPath={info.logo_path}
          />
          <GuestShell>{children}</GuestShell>
        </GuestSessionProvider>
      ) : (
        <InvalidQrScreen />
      )}
    </SurfaceTheme>
  );
}
