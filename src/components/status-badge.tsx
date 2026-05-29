import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES } from "@/lib/constants";

export function StatusBadge({
  status,
}: {
  status: "draft" | "scheduled" | "published" | "failed";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
        STATUS_BADGE_CLASSES[status]
      )}
    >
      {status}
    </span>
  );
}
