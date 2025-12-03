import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 p-6 bg-gradient-to-br from-blue-50 to-blue-100 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
