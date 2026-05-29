import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md mt-2" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-5 space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-6 space-y-4">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
