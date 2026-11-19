import { notFound } from "next/navigation";

import { MenuScreen } from "@/features/guest/menu/menu-screen";
import type { MenuData } from "@/features/guest/menu/types";
import { getCachedMenu, getTableInfo } from "@/features/guest/server/table-data";
import { reportError } from "@/lib/errors";

/** Guest menu. Server-rendered for a fast first paint; kept live on the client. */
export default async function GuestMenuPage({ params }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const info = await getTableInfo(token);
  if (!info) notFound(); // the layout already shows the "code isn't active" screen

  let menu: MenuData | null = null;
  try {
    menu = await getCachedMenu(info.restaurant_id);
  } catch (err) {
    // The client retries with its own query and shows an error state if that fails too.
    reportError(err, { where: "guest menu SSR", restaurant: info.restaurant_id });
  }

  return <MenuScreen initialMenu={menu} />;
}
