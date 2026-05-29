"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SUBSCRIPTION_BADGE_CLASSES } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/types";
import {
  CreditCard,
  Check,
  Loader2,
  Zap,
  Users,
  BarChart3,
  Globe,
  Sparkles,
  Infinity,
} from "lucide-react";

const planDetails: Record<
  SubscriptionTier,
  {
    name: string;
    price: string;
    features: string[];
    limit: { posts: string; ai: string; platforms: string };
  }
> = {
  free: {
    name: "Free",
    price: "$0",
    features: ["1 platform", "10 posts/month", "Manual posting"],
    limit: { posts: "10/mo", ai: "Not available", platforms: "1 of 5" },
  },
  pro: {
    name: "Pro",
    price: "$15/mo",
    features: [
      "5 platforms",
      "Unlimited posts",
      "AI generation (100/mo)",
      "Advanced scheduling",
      "Calendar view",
    ],
    limit: { posts: "Unlimited", ai: "100/mo", platforms: "5 of 5" },
  },
  business: {
    name: "Business",
    price: "$29/mo",
    features: [
      "5 platforms",
      "Unlimited posts",
      "Unlimited AI",
      "Advanced analytics",
      "3 team members",
      "White-label reports",
      "Priority support",
    ],
    limit: { posts: "Unlimited", ai: "Unlimited", platforms: "5 of 5" },
  },
};

const mockInvoices = [
  { date: "2026-05-01", amount: "$15.00", status: "Paid" },
  { date: "2026-04-01", amount: "$15.00", status: "Paid" },
  { date: "2026-03-01", amount: "$15.00", status: "Paid" },
];

export default function BillingPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    setTier(profile?.subscription_tier ?? "free");
    setLoading(false);
  };

  const handleCheckout = async (plan: "pro" | "business") => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    }
    setCheckoutLoading(false);
  };

  const handlePortal = async () => {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal.");
    }
  };

  const current = planDetails[tier];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-zinc-400 mt-1">Manage your plan and payment method.</p>
      </div>

      {/* Current plan */}
      <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            Current Plan
          </CardTitle>
          <Badge
            variant="outline"
            className={`capitalize ${
              SUBSCRIPTION_BADGE_CLASSES[tier]
            }`}
          >
            {tier}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">{current.price}</span>
            {tier !== "free" && (
              <span className="text-zinc-500 text-sm">/month</span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-400">Posts</span>
                <span className="font-mono text-xs">{current.limit.posts}</span>
              </div>
              <Progress
                value={tier === "free" ? 40 : 65}
                className="h-1.5 bg-[#1c1c2e]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-400">AI Credits</span>
                <span className="font-mono text-xs">{current.limit.ai}</span>
              </div>
              <Progress
                value={tier === "free" ? 0 : tier === "pro" ? 30 : 45}
                className="h-1.5 bg-[#1c1c2e]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-400">Platforms</span>
                <span className="font-mono text-xs">
                  {current.limit.platforms}
                </span>
              </div>
              <Progress
                value={tier === "free" ? 20 : 60}
                className="h-1.5 bg-[#1c1c2e]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {tier !== "pro" && (
          <Card className="bg-[#111118] border-[#1c1c2e] hover:border-violet-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                Upgrade to Pro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-3">
                $15<span className="text-sm text-zinc-500">/mo</span>
              </p>
              <ul className="space-y-2 mb-4">
                {["5 platforms", "Unlimited posts", "AI generation"].map(
                  (f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {f}
                    </li>
                  )
                )}
              </ul>
              <Button
                onClick={() => handleCheckout("pro")}
                disabled={checkoutLoading}
                className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}

        {tier !== "business" && (
          <Card className="bg-[#111118] border-[#1c1c2e] hover:border-cyan-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Upgrade to Business
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-3">
                $29<span className="text-sm text-zinc-500">/mo</span>
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "All Pro features",
                  "Unlimited AI",
                  "3 team members",
                  "White-label",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("business")}
                disabled={checkoutLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-0"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Upgrade to Business
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoice history */}
      <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {tier === "free" ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No invoices yet. Upgrade to see your billing history.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c1c2e] text-left">
                    <th className="pb-3 text-xs font-semibold text-zinc-500">
                      Date
                    </th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500">
                      Amount
                    </th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500">
                      Status
                    </th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockInvoices.map((inv) => (
                    <tr
                      key={inv.date}
                      className="border-b border-[#1c1c2e]/50 last:border-b-0"
                    >
                      <td className="py-3 text-sm">{inv.date}</td>
                      <td className="py-3 text-sm">{inv.amount}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tier !== "free" && (
            <div className="mt-4 pt-4 border-t border-[#1c1c2e] space-y-3">
              <Button
                variant="outline"
                className="border-[#1c1c2e]"
                onClick={handlePortal}
              >
                Manage Billing
              </Button>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Cancel Subscription
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
