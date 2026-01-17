import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 border-r border-white/5">
        <Sidebar />
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Main Content Area - Added pb-20 for mobile nav clearance */}
      <main className="md:pl-72 pb-20 md:pb-0 min-h-screen transition-all duration-200 ease-in-out">
        {children}
      </main>
    </div>
  );
}