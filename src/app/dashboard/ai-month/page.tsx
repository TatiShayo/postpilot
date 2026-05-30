"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Calendar,
  Save,
  Check,
  X,
} from "lucide-react";
import type { Platform } from "@/lib/types";
import { PLATFORM_CONFIG, ALL_PLATFORMS } from "@/lib/types";
import { PLATFORM_COLORS } from "@/lib/constants";

type GeneratedPost = {
  date: string;
  platform: Platform;
  content: string;
  hashtags: string;
  bestTime: string;
};

export default function AIMonthPage() {
  const router = useRouter();
  const [businessDescription, setBusinessDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["twitter"]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (!businessDescription.trim()) {
      toast.error("Please describe your business first.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription: businessDescription.trim(),
          platforms: selectedPlatforms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate. Try again.");
      } else {
        setPosts(data.posts);
        toast.success(`Generated ${data.posts.length} post ideas!`);
      }
    } catch {
      toast.error("Failed to generate content. Check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (posts.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/generate-month", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save posts.");
      } else {
        const data = await res.json();
        toast.success(`Saved ${data.saved} posts to your calendar!`);
        router.push("/dashboard/calendar");
      }
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const removePost = (index: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Month Generator</h1>
        <p className="text-zinc-400 mt-1">
          Describe your business and generate 30 days of posts in one click.
        </p>
      </div>

      <Card className="bg-[#111118] border-[#1c1c2e]">
        <CardHeader>
          <CardTitle className="text-base">What does your business do?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., We're a boutique coffee shop in Brooklyn, selling artisan coffee and pastries. Our audience cares about sustainability and local community..."
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            className="min-h-[120px]"
          />

          <div>
            <p className="text-sm text-zinc-400 mb-2">Select platforms:</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    selectedPlatforms.includes(platform)
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                      : "border-[#1c1c2e] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {selectedPlatforms.includes(platform) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50" />
                  )}
                  {PLATFORM_CONFIG[platform].name}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !businessDescription.trim()}
            className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating ? "Generating 30 posts..." : "Generate 30 Days of Content"}
          </Button>
        </CardContent>
      </Card>

      {generating && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {posts.length} Posts Generated
            </h2>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save All to Calendar"}
            </Button>
          </div>

          <div className="space-y-3">
            {posts.map((post, i) => (
              <Card
                key={i}
                className="bg-[#111118] border-[#1c1c2e] hover:border-[#252536] transition-colors group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-500">
                          {post.date} · {post.bestTime}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-zinc-700 text-zinc-400"
                        >
                          {PLATFORM_CONFIG[post.platform]?.name || post.platform}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{post.content}</p>
                      {post.hashtags && (
                        <p className="text-xs text-violet-400">{post.hashtags}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removePost(i)}
                      className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {posts.length === 0 && !generating && (
        <Card className="bg-[#111118] border-[#1c1c2e]">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">
              Describe your business above and click generate to fill your calendar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
