import { cn } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import type { Platform } from "@/lib/types";

const platformMap: Record<Platform, string> = {
  twitter: "X",
  linkedin: "in",
  instagram: "IG",
  facebook: "fb",
  tiktok: "TT",
};

export function PlatformChip({
  platform,
  size = "sm",
}: {
  platform: Platform;
  size?: "sm" | "xs";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold text-white shrink-0",
        size === "sm" ? "w-6 h-6 text-[10px]" : "w-5 h-5 text-[9px]"
      )}
      style={{ backgroundColor: PLATFORM_COLORS[platform] }}
      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
    >
      {platformMap[platform]}
    </span>
  );
}

export function PlatformBadge({
  platform,
}: {
  platform: Platform;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
      style={{ backgroundColor: PLATFORM_COLORS[platform] }}
    >
      {platformMap[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  );
}
