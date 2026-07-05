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
    <div className="flex min-h-screen bg-muted-bg">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="w-full max-w-[1400px] mx-auto px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
