"use client";

import { Button } from "@/components/ui/button";

export default function TemplatesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-semibold mb-2">Failed to load templates</h2>
      <p className="text-zinc-400 mb-6 text-sm">Something went wrong. Please try again.</p>
      <Button onClick={reset} variant="outline">Try Again</Button>
    </div>
  );
}
