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
