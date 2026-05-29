"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  ImagePlus,
  X,
  Clock,
  Send,
  Save,
  Eye,
  ChevronDown,
} from "lucide-react";
import type { Platform } from "@/lib/types";
import { PLATFORM_CONFIG, ALL_PLATFORMS } from "@/lib/types";
import { PLATFORM_COLORS } from "@/lib/constants";

const TONES = ["professional", "casual", "witty", "inspirational"];
const GOALS = ["engagement", "awareness", "sales", "traffic"];

type AIGeneratedPost = {
  content: string;
  hashtags: string;
  bestTime: string;
};

export default function ComposePage() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["twitter"]);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [viewTab, setViewTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiGoal, setAiGoal] = useState("engagement");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<AIGeneratedPost[]>([]);
  const [aiError, setAiError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const activeMaxChars = selectedPlatforms.length
    ? Math.min(
        ...selectedPlatforms.map((p) => PLATFORM_CONFIG[p].maxChars)
      )
    : 280;

  const charCount = content.length;
  const isOverLimit = charCount > activeMaxChars;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const path = `post-media/${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file);

    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(path);

    setMediaUrls((prev) => [...prev, urlData.publicUrl]);
    toast.success("Image uploaded!");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Please describe your business and post goal.");
      return;
    }
    setAiGenerating(true);
    setAiError("");
    setAiResults([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription: aiPrompt,
          platform: selectedPlatforms[0] ?? "twitter",
          tone: aiTone,
          goal: aiGoal,
          postsCount: 3,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setAiResults(data.posts ?? []);
      toast.success("AI generated 3 post variations!");
    } catch (err: any) {
      setAiError(err.message);
      toast.error(err.message);
    }

    setAiGenerating(false);
  };

  const useAiPost = (post: AIGeneratedPost) => {
    setContent(post.content + "\n\n" + post.hashtags);
  };

  const handleSave = async (status: "draft" | "scheduled" | "published") => {
    if (!content.trim()) {
      toast.error("Please enter some content.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let scheduledAt: string | null = null;
    let publishedAt: string | null = null;

    if (status === "scheduled" && scheduleType === "later") {
      scheduledAt = new Date(
        `${scheduledDate}T${scheduledTime || "09:00"}`
      ).toISOString();
    } else if (status === "published") {
      publishedAt = new Date().toISOString();
    } else if (
      status === "scheduled" &&
      scheduleType === "now"
    ) {
      scheduledAt = new Date().toISOString();
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      media_urls: mediaUrls,
      platforms: selectedPlatforms,
      status,
      scheduled_at: scheduledAt,
      published_at: publishedAt,
      ai_generated: false,
    });

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      const label =
        status === "draft"
          ? "draft"
          : status === "scheduled"
          ? "scheduled"
          : "published";
      toast.success(`Post ${label}!`);
      if (status === "published" || status === "scheduled") {
        router.push("/dashboard/calendar");
      } else {
        setContent("");
        setMediaUrls([]);
      }
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compose Post</h1>
        <p className="text-zinc-400 mt-1">
          Create and schedule content for your social platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Selector */}
          <Card className="bg-[#111118] border-[#1c1c2e] p-4">
            <p className="text-sm font-medium text-zinc-300 mb-3">
              Select Platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((platform) => {
                const cfg = PLATFORM_CONFIG[platform];
                const active = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                      active
                        ? "text-white border-transparent"
                        : "text-zinc-500 border-[#1c1c2e] hover:text-zinc-300 hover:border-zinc-600"
                    )}
                    style={
                      active
                        ? { backgroundColor: PLATFORM_COLORS[platform] }
                        : undefined
                    }
                  >
                    {cfg.name}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Tabs: Edit / Preview */}
          <div>
            <div className="flex border-b border-[#1c1c2e] mb-4">
              {(["edit", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    viewTab === tab
                      ? "border-violet-500 text-violet-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab === "edit" ? (
                    <Send className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {tab === "edit" ? "Edit" : "Preview"}
                </button>
              ))}
            </div>

            {viewTab === "edit" ? (
              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="What do you want to share?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] text-base resize-y"
                    maxLength={activeMaxChars + 100}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-3">
                    <span
                      className={cn(
                        "text-xs font-mono",
                        isOverLimit
                          ? "text-red-400"
                          : charCount > activeMaxChars * 0.9
                          ? "text-yellow-400"
                          : "text-zinc-500"
                      )}
                    >
                      {charCount}/{activeMaxChars}
                    </span>
                  </div>
                </div>

                {selectedPlatforms.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-zinc-500">Character limits:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlatforms.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            charCount > PLATFORM_CONFIG[p].maxChars
                              ? "text-red-400 border-red-500/30"
                              : "text-zinc-500 border-zinc-700"
                          )}
                        >
                          {PLATFORM_CONFIG[p].name}: {charCount}/
                          {PLATFORM_CONFIG[p].maxChars}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image upload */}
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="border-dashed border-[#1c1c2e]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>

                  {mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {mediaUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt="Upload preview"
                            className="w-20 h-20 rounded-lg object-cover border border-[#1c1c2e]"
                          />
                          <button
                            onClick={() => removeMedia(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Preview tab */
              <div className="space-y-4">
                {selectedPlatforms.map((platform) => (
                  <div
                    key={platform}
                    className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                      >
                        {platform.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">
                        {PLATFORM_CONFIG[platform].name}
                      </span>
                    </div>
                    <div className="bg-[#0c0c14] rounded-lg p-4 min-h-[100px]">
                      <p className="text-sm whitespace-pre-wrap text-zinc-300">
                        {content || (
                          <span className="text-zinc-600">
                            Your post preview will appear here...
                          </span>
                        )}
                      </p>
                      {mediaUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {mediaUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-full max-w-[200px] rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule picker */}
          <Card className="bg-[#111118] border-[#1c1c2e] p-4">
            <p className="text-sm font-medium text-zinc-300 mb-3">
              When to post
            </p>
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleType === "now"}
                  onChange={() => setScheduleType("now")}
                  className="accent-violet-500"
                />
                <span className="text-sm flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Post now
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleType === "later"}
                  onChange={() => setScheduleType("later")}
                  className="accent-violet-500"
                />
                <span className="text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Schedule
                </span>
              </label>
            </div>

            {scheduleType === "later" && (
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-auto"
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-auto"
                />
              </div>
            )}
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              className="border-[#1c1c2e]"
              onClick={() => handleSave("draft")}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() =>
                handleSave(scheduleType === "now" ? "scheduled" : "scheduled")
              }
              disabled={saving}
              className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              {scheduleType === "now" ? "Post Now" : "Schedule Post"}
            </Button>
          </div>
        </div>

        {/* Right: AI Generator */}
        <div className="space-y-4">
          <Card className="bg-[#111118] border-[#1c1c2e] p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold">AI Generator</h3>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Describe your business and what this post is about..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[80px]"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Tone
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full rounded-lg border border-[#1c1c2e] bg-[#0c0c14] px-2.5 py-2 text-sm outline-none focus:border-violet-500/50"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Goal
                  </label>
                  <select
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    className="w-full rounded-lg border border-[#1c1c2e] bg-[#0c0c14] px-2.5 py-2 text-sm outline-none focus:border-violet-500/50"
                  >
                    {GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Posts
                  </>
                )}
              </Button>

              {aiError && (
                <p className="text-sm text-red-400">{aiError}</p>
              )}

              {aiResults.length > 0 && (
                <div className="space-y-3 mt-2">
                  <p className="text-xs text-zinc-500 font-medium">
                    3 Variations
                  </p>
                  {aiResults.map((post, i) => (
                    <Card
                      key={i}
                      className="bg-[#0c0c14] border-[#1c1c2e] p-3 hover:border-violet-500/30 transition-colors cursor-pointer"
                      onClick={() => useAiPost(post)}
                    >
                      <p className="text-sm text-zinc-300 line-clamp-3">
                        {post.content}
                      </p>
                      <p className="text-xs text-violet-400 mt-1.5">
                        {post.hashtags}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-600">
                          Best time: {post.bestTime}
                        </span>
                        <span className="text-[10px] text-violet-400 font-medium">
                          Click to use →
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
