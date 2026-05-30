import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Dashboard — PostPilot",
  description: "Manage your social media posts, schedule content, and track analytics with PostPilot.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-[#09090f]">
      <Sidebar />
      <main className="ml-[240px] min-h-screen p-6 lg:p-8">{children}</main>
    </div>
  );
}
