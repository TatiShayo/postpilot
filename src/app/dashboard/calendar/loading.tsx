import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md mt-2" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      <Skeleton className="h-14 w-full rounded-xl" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#1c1c2e]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center">
              <Skeleton className="h-3 w-8 mx-auto rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="min-h-[100px] p-2 border-r border-b border-[#1c1c2e]">
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
