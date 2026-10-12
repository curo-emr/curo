import { cookies } from "next/headers";

/**
 * Whether the sidebar starts open, from the `sidebar_state` cookie the sidebar
 * writes when it's collapsed or expanded (ui/sidebar). For a portal's server
 * layout, so a collapsed sidebar stays collapsed on the next visit.
 */
export async function sidebarStartsOpen(): Promise<boolean> {
  return (await cookies()).get("sidebar_state")?.value !== "false";
}
