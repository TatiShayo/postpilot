"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function BillingErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto" />
        <h2 className="text-lg font-semibold">Billing Error</h2>
        <p className="text-sm text-zinc-400">
          {error.message || "Failed to load billing."}
        </p>
        <Button onClick={reset} className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0">
          Try Again
        </Button>
      </div>
    </div>
  );
}
