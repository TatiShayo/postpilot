"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { PlatformChip } from "@/components/platform-chip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import type { Platform, Post } from "@/lib/types";
import { ALL_PLATFORMS } from "@/lib/types";

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayPosts, setSelectedDayPosts] = useState<Post[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterPlatforms, setFilterPlatforms] = useState<Set<Platform>>(
    new Set(ALL_PLATFORMS)
  );

  const fetchPosts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Also include posts from padding days
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_at", calStart.toISOString())
      .lte("scheduled_at", calEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    setPosts(data ?? []);
    setLoading(false);
  }, [supabase, currentDate]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPostsForDay = (date: Date): Post[] => {
    return posts.filter(
      (p) =>
        p.scheduled_at &&
        isSameDay(new Date(p.scheduled_at), date) &&
        p.platforms?.some((pf) => filterPlatforms.has(pf as Platform))
    );
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setSelectedDayPosts(getPostsForDay(date));
    setSheetOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedDayPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const toggleFilter = (platform: Platform) => {
    setFilterPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-zinc-400 mt-1">Plan and manage your content schedule.</p>
        </div>
        <Link href="/dashboard/compose">
          <Button className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Platform filter chips */}
      <Card className="bg-[#111118] border-[#1c1c2e] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400 mr-2">Filter:</span>
          {ALL_PLATFORMS.map((platform) => (
            <button
              key={platform}
              onClick={() => toggleFilter(platform)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                filterPlatforms.has(platform)
                  ? "text-white border-transparent"
                  : "text-zinc-500 border-[#1c1c2e] opacity-50 hover:opacity-80"
              )}
              style={
                filterPlatforms.has(platform)
                  ? { backgroundColor: PLATFORM_COLORS[platform] }
                  : undefined
              }
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[platform] }}
              />
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#1c1c2e]"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-[#1c1c2e]"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#1c1c2e]"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <Card className="bg-[#111118] border-[#1c1c2e] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#1c1c2e]">
              {dayHeaders.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayPosts = getPostsForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[100px] p-2 border-r border-b border-[#1c1c2e] text-left hover:bg-[#1c1c2e]/30 transition-colors relative",
                      !isCurrentMonth && "opacity-30",
                      today && "bg-violet-500/5"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        today
                          ? "bg-violet-500 text-white"
                          : isCurrentMonth
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1.5 space-y-0.5">
                      {dayPosts.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center gap-1.5"
                        >
                          {post.platforms?.slice(0, 2).map((p) => (
                            <div
                              key={p}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  PLATFORM_COLORS[p as Platform],
                              }}
                            />
                          ))}
                          <span className="text-[10px] text-zinc-500 truncate flex-1">
                            {post.content.slice(0, 30)}...
                          </span>
                        </div>
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[10px] text-violet-400">
                          +{dayPosts.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Day detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] bg-[#111118] border-l border-[#1c1c2e] text-zinc-100">
          <SheetHeader>
            <SheetTitle className="text-lg">
              {selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                No posts for this day.
              </p>
            ) : (
              selectedDayPosts.map((post) => (
                <Card
                  key={post.id}
                  className="bg-[#0c0c14] border-[#1c1c2e] p-4 space-y-3"
                >
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.platforms?.map((p) => (
                      <PlatformChip
                        key={p}
                        platform={p as Platform}
                        size="xs"
                      />
                    ))}
                    <StatusBadge status={post.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">
                      {post.scheduled_at
                        ? format(new Date(post.scheduled_at), "h:mm a")
                        : "No time set"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link href="/dashboard/compose">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500 hover:text-red-400"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
