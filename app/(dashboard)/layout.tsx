import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className="ml-64 mt-16 p-6">
        {children}
      </main>
    </>
  );
}
