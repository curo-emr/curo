import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 h-full shrink-0">
      <SidebarContent />
    </aside>
  );
}
