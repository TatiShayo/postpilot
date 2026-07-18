"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImpressionsChart, EngagementChart } from "@/components/analytics-charts";
import { generateTimeSeriesData, generateEngagementByPlatform } from "@/lib/mock-analytics";
import { ALL_PLATFORMS } from "@/lib/types";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Award,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d";

const dateRangeMap: Record<DateRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const timeSeriesData = useMemo(
    () => generateTimeSeriesData(dateRangeMap[dateRange]),
    [dateRange]
  );
  const engagementData = useMemo(() => generateEngagementByPlatform(), []);

  const totalImpressions = timeSeriesData.reduce(
    (sum, day) =>
      sum +
      ALL_PLATFORMS.reduce(
        (s, p) => s + ((day[p] as number) || 0),
        0
      ),
    0
  );

  const totalEngagement = engagementData.reduce(
    (sum, p) => sum + p.likes + p.comments + p.shares,
    0
  );

  const mockPosts = [
    {
      content: "Excited to launch our new product line! 🚀",
      platform: "twitter" as const,
      impressions: 12430,
      likes: 842,
      comments: 56,
      shares: 123,
    },
    {
      content: "5 tips for small business owners to maximize their reach",
      platform: "linkedin" as const,
      impressions: 8920,
      likes: 654,
      comments: 89,
      shares: 201,
    },
    {
      content: "Behind the scenes at our office — where the magic happens ✨",
      platform: "instagram" as const,
      impressions: 15400,
      likes: 1203,
      comments: 134,
      shares: 67,
    },
    {
      content: "Happy customers are the best customers. Here's what they say",
      platform: "facebook" as const,
      impressions: 6700,
      likes: 345,
      comments: 42,
      shares: 89,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-zinc-400 mt-1">Track your social media performance.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[#1c1c2e] p-1">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                dateRange === range
                  ? "bg-[#111118] text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {range === "7d" ? "7 days" : range === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Impressions",
            value: totalImpressions.toLocaleString(),
            icon: <Eye className="w-5 h-5" />,
            trend: { value: "12.5% from last period", positive: true },
          },
          {
            label: "Total Engagement",
            value: totalEngagement.toLocaleString(),
            icon: <Heart className="w-5 h-5" />,
            trend: { value: "8.3% from last period", positive: true },
          },
          {
            label: "Best Post",
            value: "+1,203 likes",
            icon: <Award className="w-5 h-5" />,
          },
          {
            label: "Growth Rate",
            value: "24.8%",
            icon: <TrendingUp className="w-5 h-5" />,
            trend: { value: "vs previous period", positive: true },
          },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111118] border-[#1c1c2e]">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                {stat.trend && (
                  <p
                    className={`text-xs font-medium ${
                      stat.trend.positive
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    ↑ {stat.trend.value}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impressions over time */}
        <Card className="bg-[#111118] border-[#1c1c2e]">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              Impressions Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImpressionsChart data={timeSeriesData} />
          </CardContent>
        </Card>

        {/* Engagement by platform */}
        <Card className="bg-[#111118] border-[#1c1c2e]">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-violet-400" />
              Engagement by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementChart data={engagementData} />
          </CardContent>
        </Card>
      </div>

      {/* Post performance table */}
      <Card className="bg-[#111118] border-[#1c1c2e]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Post Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c1c2e] text-left">
                  <th className="pb-3 text-xs font-semibold text-zinc-500">
                    Post
                  </th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500">
                    Platform
                  </th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 text-right">
                    Impressions
                  </th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 text-right">
                    Likes
                  </th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 text-right">
                    Comments
                  </th>
                  <th className="pb-3 text-xs font-semibold text-zinc-500 text-right">
                    Shares
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockPosts.map((post, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1c1c2e]/50 last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <p className="text-sm truncate max-w-[250px]">
                        {post.content}
                      </p>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-zinc-700 text-zinc-400"
                      >
                        {post.platform.charAt(0).toUpperCase() +
                          post.platform.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-right font-mono">
                      {post.impressions.toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-right font-mono">
                      {post.likes.toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-right font-mono">
                      {post.comments.toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-right font-mono">
                      {post.shares.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
