"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { generateTimeSeriesData, generateEngagementByPlatform } from "@/lib/mock-analytics";
import { PLATFORM_COLORS } from "@/lib/constants";
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
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any[]>([]);

  useEffect(() => {
    const days = dateRangeMap[dateRange];
    setTimeSeriesData(generateTimeSeriesData(days));
    setEngagementData(generateEngagementByPlatform());
  }, [dateRange]);

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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" />
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111118",
                    border: "1px solid #1c1c2e",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                />
                {ALL_PLATFORMS.map((platform) => (
                  <Line
                    key={platform}
                    type="monotone"
                    dataKey={platform}
                    stroke={PLATFORM_COLORS[platform]}
                    strokeWidth={2}
                    dot={false}
                    name={
                      platform.charAt(0).toUpperCase() + platform.slice(1)
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" />
                <XAxis
                  dataKey="platform"
                  stroke="#52525b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111118",
                    border: "1px solid #1c1c2e",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Bar dataKey="likes" stackId="a" fill="#8b5cf6" name="Likes" radius={[0, 0, 0, 0]} />
                <Bar dataKey="comments" stackId="a" fill="#06b6d4" name="Comments" radius={[0, 0, 0, 0]} />
                <Bar dataKey="shares" stackId="a" fill="#f59e0b" name="Shares" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
