import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { PlatformChip } from "@/components/platform-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Send,
  Link2,
  Sparkles,
  PenLine,
  BarChart3,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user!.id)
    .order("scheduled_at", { ascending: true });

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_connected", true);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const scheduledPosts = posts?.filter((p) => p.status === "scheduled") ?? [];
  const publishedThisMonth =
    posts?.filter((p) => {
      if (p.status !== "published") return false;
      const d = new Date(p.published_at ?? "");
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }) ?? [];

  const upcomingPosts = (posts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at!).getTime() -
        new Date(b.scheduled_at!).getTime()
    )
    .slice(0, 5);

  const recentActivity = (posts ?? [])
    .filter((p) => p.status === "published")
    .sort(
      (a, b) =>
        new Date(b.published_at!).getTime() -
        new Date(a.published_at!).getTime()
    )
    .slice(0, 5);

  const tier = profile?.subscription_tier ?? "free";
  const aiCreditsText =
    tier === "free" ? "Upgrade for AI" : tier === "pro" ? "100/mo" : "Unlimited";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-zinc-400 mt-1">
          Here&apos;s what&apos;s happening with your content today.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Scheduled Posts"
          value={scheduledPosts.length}
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <StatsCard
          label="Published This Month"
          value={publishedThisMonth.length}
          icon={<Send className="w-5 h-5" />}
        />
        <StatsCard
          label="Accounts Connected"
          value={accounts?.length ?? 0}
          icon={<Link2 className="w-5 h-5" />}
        />
        <StatsCard
          label="AI Credits"
          value={aiCreditsText}
          icon={<Sparkles className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Posts */}
        <div className="lg:col-span-2">
          <Card className="bg-[#111118] border-[#1c1c2e]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Upcoming Posts
              </CardTitle>
              <Link href="/dashboard/calendar">
                <Button variant="ghost" size="sm" className="text-zinc-400 gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingPosts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No upcoming posts</p>
                  <Link href="/dashboard/compose">
                    <Button size="sm" variant="outline" className="mt-3">
                      Schedule your first post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#1c1c2e]/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex gap-1">
                            {post.platforms?.map((p: string) => (
                              <PlatformChip
                                key={p}
                                platform={p as "twitter" | "linkedin" | "instagram" | "facebook" | "tiktok"}
                                size="xs"
                              />
                            ))}
                          </div>
                          <StatusBadge status={post.status} />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {post.scheduled_at
                          ? format(new Date(post.scheduled_at), "MMM d, h:mm a")
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card className="bg-[#111118] border-[#1c1c2e]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/compose" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                >
                  <Sparkles className="w-4 h-4" />
                  Write with AI
                </Button>
              </Link>
              <Link href="/dashboard/compose" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                >
                  <PenLine className="w-4 h-4" />
                  Schedule Post
                </Button>
              </Link>
              <Link href="/dashboard/calendar" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                >
                  <Calendar className="w-4 h-4" />
                  View Calendar
                </Button>
              </Link>
              <Link href="/dashboard/analytics" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-[#111118] border-[#1c1c2e]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No recent activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((post) => (
                    <div key={post.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-zinc-300 truncate">
                          Post published on{" "}
                          <span className="text-zinc-400">
                            {post.platforms?.[0] ?? "unknown"}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-zinc-600 ml-3.5 mt-0.5">
                        {post.published_at
                          ? format(new Date(post.published_at), "MMM d, h:mm a")
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
