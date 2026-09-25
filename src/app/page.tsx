import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { serverSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppShell email={user.email ?? ""} />;
}
