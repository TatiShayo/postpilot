import { createClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/lib/types";
import { PLATFORM_LIMITS, POST_LIMITS, AI_LIMITS } from "@/lib/types";

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  const profile = await getUserProfile();
  return profile?.subscription_tier ?? "free";
}

export async function checkPlatformLimit(
  platformCount: number
): Promise<boolean> {
  const tier = await getSubscriptionTier();
  const limit = PLATFORM_LIMITS[tier];
  return platformCount < limit;
}

export async function checkPostLimit(
  currentMonthCount: number
): Promise<boolean> {
  const tier = await getSubscriptionTier();
  const limit = POST_LIMITS[tier];
  return currentMonthCount < limit;
}

export async function checkAIAccess(): Promise<boolean> {
  const tier = await getSubscriptionTier();
  return AI_LIMITS[tier] > 0;
}

export async function getAIAvailableCredits(): Promise<number> {
  const tier = await getSubscriptionTier();
  return AI_LIMITS[tier];
}

/**
 * Denial-of-wallet guard: atomically consumes one AI credit against the
 * caller's monthly per-user quota BEFORE any paid OpenAI call is made.
 *
 * Enforcement is server-side and atomic (Postgres `consume_ai_credit` RPC with
 * an `on conflict ... where count < limit` upsert), so it cannot be bypassed by
 * rotating IPs or firing concurrent requests. Business tier (Infinity) is
 * uncapped and short-circuits without a DB round-trip.
 */
export async function enforceAIQuota(): Promise<{
  ok: boolean;
  reason?: "unauthorized" | "no_access" | "quota_exceeded" | "error";
}> {
  const profile = await getUserProfile();
  if (!profile) return { ok: false, reason: "unauthorized" };

  const tier: SubscriptionTier = profile.subscription_tier ?? "free";
  const limit = AI_LIMITS[tier];

  if (limit <= 0) return { ok: false, reason: "no_access" };
  if (limit === Infinity) return { ok: true };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_ai_credit", {
    p_limit: limit,
  });

  if (error) {
    console.error("consume_ai_credit failed:", error.message);
    // Fail closed — never let a metering failure enable unlimited paid calls.
    return { ok: false, reason: "error" };
  }

  return data === true ? { ok: true } : { ok: false, reason: "quota_exceeded" };
}
