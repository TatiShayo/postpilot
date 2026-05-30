"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Heart,
  Eye,
  X,
  ExternalLink,
} from "lucide-react";
import type { Platform } from "@/lib/types";
import { PLATFORM_CONFIG } from "@/lib/types";

type Competitor = {
  handle: string;
  platform: Platform;
  name: string;
  recentPosts: number;
  avgEngagement: number;
  postsPerWeek: number;
  topContent: string;
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [searching, setSearching] = useState(false);

  const addCompetitor = async () => {
    if (!handle.trim()) return;
    setSearching(true);

    try {
      await new Promise((r) => setTimeout(r, 800));
      const mock: Competitor = {
        handle: handle.trim(),
        platform,
        name: `@${handle.trim()}`,
        recentPosts: Math.floor(Math.random() * 50) + 10,
        avgEngagement: Math.floor(Math.random() * 5000) + 500,
        postsPerWeek: Math.floor(Math.random() * 7) + 1,
        topContent: ["Educational threads", "Behind-the-scenes", "User-generated content"][Math.floor(Math.random() * 3)],
      };
      setCompetitors((prev) => {
        if (prev.some((c) => c.handle === mock.handle && c.platform === mock.platform)) {
          toast.error("Competitor already added.");
          return prev;
        }
        return [...prev, mock];
      });
      setHandle("");
    } catch {
      toast.error("Failed to look up competitor.");
    } finally {
      setSearching(false);
    }
  };

  const removeCompetitor = (handle: string, platform: Platform) => {
    setCompetitors((prev) => prev.filter((c) => c.handle !== handle || c.platform !== platform));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Monitor</h1>
        <p className="text-zinc-400 mt-1">
          Track competitors&apos; social media activity and engagement.
        </p>
      </div>

      <Card className="bg-[#111118] border-[#1c1c2e]">
        <CardHeader>
          <CardTitle className="text-base">Add a competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="@handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
            />
            <div className="flex gap-2">
              {(["twitter", "instagram", "linkedin", "facebook", "tiktok"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    platform === p
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                      : "border-[#1c1c2e] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {PLATFORM_CONFIG[p].name.split(" ")[0]}
                </button>
              ))}
            </div>
            <Button
              onClick={addCompetitor}
              disabled={searching || !handle.trim()}
              className="bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border-0"
            >
              <Search className="w-4 h-4 mr-2" />
              {searching ? "Looking up..." : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {competitors.length === 0 && (
        <Card className="bg-[#111118] border-[#1c1c2e]">
          <CardContent className="py-12 text-center">
            <Eye className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">
              Add competitors above to start tracking their activity.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.map((comp) => (
          <Card key={`${comp.handle}-${comp.platform}`} className="bg-[#111118] border-[#1c1c2e]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-lg font-bold text-violet-400">
                    {comp.handle[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{comp.name}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-600" />
                    </div>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {PLATFORM_CONFIG[comp.platform].name}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => removeCompetitor(comp.handle, comp.platform)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#1c1c2e]/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{comp.recentPosts}</p>
                  <p className="text-[10px] text-zinc-500">Recent Posts</p>
                </div>
                <div className="bg-[#1c1c2e]/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{comp.avgEngagement.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500">Avg Engagement</p>
                </div>
                <div className="bg-[#1c1c2e]/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{comp.postsPerWeek}/wk</p>
                  <p className="text-[10px] text-zinc-500">Post Frequency</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Top content type: <span className="text-zinc-300">{comp.topContent}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
