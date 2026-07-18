import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PLATFORM_CONFIG } from "@/lib/types";
import type { Platform } from "@/lib/types";
import { Sparkles, Calendar, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Public Portfolio — PostPilot",
  description: "View published social media content powered by PostPilot.",
  robots: { index: false, follow: false },
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, username, full_name, avatar_url")
    .eq("username", username)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    notFound();
  }

  const profile = profiles[0];

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const displayPosts = posts || [];

  return (
    <div className="min-h-screen bg-[#09090f]">
      <header className="border-b border-[#1c1c2e] bg-[#0c0c14]">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl">
            {(profile.full_name || username)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile.full_name || username}</h1>
            <p className="text-zinc-400 text-sm">@{username}</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-violet-500/10 text-violet-400 border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by PostPilot
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            Published Posts ({displayPosts.length})
          </h2>
        </div>

        {displayPosts.length === 0 && (
          <Card className="bg-[#111118] border-[#1c1c2e]">
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No published posts yet.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayPosts.map((post) => (
            <Card key={post.id} className="bg-[#111118] border-[#1c1c2e]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                    {PLATFORM_CONFIG[post.platforms?.[0] as Platform]?.name || post.platforms?.[0] || "post"}
                  </Badge>
                  {post.published_at && (
                    <span className="text-[10px] text-zinc-600">
                      {format(new Date(post.published_at), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.hashtags && (
                  <p className="text-xs text-violet-400 mt-2">{post.hashtags}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#1c1c2e] py-6 text-center">
        <p className="text-xs text-zinc-600">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Powered by{" "}
          <span className="font-medium text-zinc-400">
            Post<span className="text-violet-400">Pilot</span>
          </span>
        </p>
      </footer>
    </div>
  );
}
