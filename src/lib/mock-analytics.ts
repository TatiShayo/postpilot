import type { Platform, PostAnalytics } from "./types";
import { ALL_PLATFORMS } from "./types";

export function generateMockAnalytics(postId: string, platform: Platform): PostAnalytics {
  const impressions = Math.floor(Math.random() * 10000) + 200;
  const likes = Math.floor(impressions * (Math.random() * 0.08 + 0.01));
  const comments = Math.floor(likes * (Math.random() * 0.3 + 0.05));
  const shares = Math.floor(likes * (Math.random() * 0.15 + 0.02));
  const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));

  return {
    id: crypto.randomUUID(),
    post_id: postId,
    platform,
    impressions,
    likes,
    comments,
    shares,
    clicks,
    recorded_at: new Date().toISOString(),
  };
}

export function generateTimeSeriesData(days: number) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const entry: Record<string, string | number> = { date: dateStr };
    for (const platform of ALL_PLATFORMS) {
      entry[platform] = Math.floor(Math.random() * 5000) + 500;
    }
    data.push(entry);
  }

  return data;
}

export function generateEngagementByPlatform() {
  return ALL_PLATFORMS.map((platform) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    likes: Math.floor(Math.random() * 3000) + 500,
    comments: Math.floor(Math.random() * 800) + 100,
    shares: Math.floor(Math.random() * 400) + 50,
  }));
}
