"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_CONFIG } from "@/lib/types";
import type { Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const bestTimes: Record<
  Platform,
  { day: string; time: string; engagement: string }[]
> = {
  twitter: [
    { day: "Mon", time: "9:00 AM", engagement: "High" },
    { day: "Tue", time: "8:00 AM", engagement: "Highest" },
    { day: "Wed", time: "12:00 PM", engagement: "High" },
    { day: "Thu", time: "5:00 PM", engagement: "Medium" },
    { day: "Fri", time: "7:00 AM", engagement: "High" },
    { day: "Sat", time: "10:00 AM", engagement: "Medium" },
    { day: "Sun", time: "10:00 AM", engagement: "Low" },
  ],
  linkedin: [
    { day: "Mon", time: "10:00 AM", engagement: "High" },
    { day: "Tue", time: "8:00 AM", engagement: "Highest" },
    { day: "Wed", time: "9:00 AM", engagement: "Highest" },
    { day: "Thu", time: "8:00 AM", engagement: "High" },
    { day: "Fri", time: "8:00 AM", engagement: "Medium" },
    { day: "Sat", time: "10:00 AM", engagement: "Low" },
    { day: "Sun", time: "11:00 AM", engagement: "Low" },
  ],
  instagram: [
    { day: "Mon", time: "11:00 AM", engagement: "High" },
    { day: "Tue", time: "10:00 AM", engagement: "High" },
    { day: "Wed", time: "11:00 AM", engagement: "Highest" },
    { day: "Thu", time: "12:00 PM", engagement: "High" },
    { day: "Fri", time: "9:00 AM", engagement: "Medium" },
    { day: "Sat", time: "10:00 AM", engagement: "Medium" },
    { day: "Sun", time: "8:00 PM", engagement: "Low" },
  ],
  facebook: [
    { day: "Mon", time: "9:00 AM", engagement: "Medium" },
    { day: "Tue", time: "8:00 AM", engagement: "High" },
    { day: "Wed", time: "1:00 PM", engagement: "Highest" },
    { day: "Thu", time: "9:00 AM", engagement: "High" },
    { day: "Fri", time: "10:00 AM", engagement: "Medium" },
    { day: "Sat", time: "10:00 AM", engagement: "Low" },
    { day: "Sun", time: "12:00 PM", engagement: "Low" },
  ],
  tiktok: [
    { day: "Mon", time: "7:00 AM", engagement: "High" },
    { day: "Tue", time: "7:00 PM", engagement: "Highest" },
    { day: "Wed", time: "6:00 PM", engagement: "Highest" },
    { day: "Thu", time: "7:00 PM", engagement: "High" },
    { day: "Fri", time: "7:00 AM", engagement: "High" },
    { day: "Sat", time: "10:00 AM", engagement: "Medium" },
    { day: "Sun", time: "8:00 AM", engagement: "Low" },
  ],
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = [
  "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM",
  "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM",
];

const engagementScore: Record<string, number> = {
  Highest: 3,
  High: 2,
  Medium: 1,
  Low: 0,
};

export default function BestTimePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Best Time to Post</h1>
        <p className="text-zinc-400 mt-1">
          AI-suggested posting times based on industry research and engagement data.
        </p>
      </div>

      {(["twitter", "linkedin", "instagram", "facebook", "tiktok"] as Platform[]).map((platform) => {
        const times = bestTimes[platform];
        return (
          <Card key={platform} className="bg-[#111118] border-[#1c1c2e]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLATFORM_CONFIG[platform].color }}
                />
                {PLATFORM_CONFIG[platform].name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-px min-w-[600px]">
                  <div />
                  {days.map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs text-zinc-500 font-medium py-2"
                    >
                      {d}
                    </div>
                  ))}

                  {hours.map((hour) => {
                    const matchingTimes = times.filter(
                      (t) => t.time === hour
                    );
                    const dayMap = Object.fromEntries(
                      matchingTimes.map((t) => [t.day, t.engagement])
                    );

                    return (
                      <div key={hour} className="contents">
                        <div className="text-[10px] text-zinc-600 text-right pr-2 py-2">
                          {hour}
                        </div>
                        {days.map((day) => {
                          const score = engagementScore[dayMap[day]] || 0;
                          return (
                            <div
                              key={`${day}-${hour}`}
                              className={cn(
                                "h-8 m-0.5 rounded",
                                score === 3 && "bg-emerald-500/40",
                                score === 2 && "bg-violet-500/30",
                                score === 1 && "bg-amber-500/20",
                                score === 0 && "bg-[#1c1c2e]/30"
                              )}
                            >
                              {score > 0 && (
                                <div className="flex items-center justify-center h-full text-[9px] text-zinc-300 font-mono">
                                  {dayMap[day]}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500/40" />
                  <span className="text-[10px] text-zinc-500">Highest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-violet-500/30" />
                  <span className="text-[10px] text-zinc-500">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-500/20" />
                  <span className="text-[10px] text-zinc-500">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#1c1c2e]/30" />
                  <span className="text-[10px] text-zinc-500">Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
