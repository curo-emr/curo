import { notFound } from "next/navigation";

// Any URL that matches no page lands here, so its 404 shows inside the portal (see ../not-found.tsx).
export default function UnmatchedRoute() {
  notFound();
}
