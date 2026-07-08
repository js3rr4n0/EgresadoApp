import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-muted-bg print:bg-white print:block">
      <AdminSidebar />
      <div className="flex-1 lg:ml-[280px] w-full min-w-0 print:ml-0 print:w-full">
        <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 overflow-x-hidden print:p-0 print:max-w-none print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
