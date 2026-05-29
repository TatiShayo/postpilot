import { Skeleton } from "@/components/ui/skeleton";

export default function ComposeLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-4 space-y-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-lg" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>

          <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-4 space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-8 w-48 rounded-md" />
          </div>

          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-5 space-y-4">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
