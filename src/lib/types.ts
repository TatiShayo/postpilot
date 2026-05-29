export type SubscriptionTier = "free" | "pro" | "business";

export type Platform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "tiktok";

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  username: string | null;
  display_name: string | null;
  is_connected: boolean;
  followers_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  platforms: Platform[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  ai_generated: boolean;
  created_at: string;
}

export interface PostAnalytics {
  id: string;
  post_id: string;
  platform: Platform;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  clicks: number;
  recorded_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: SubscriptionTier;
  status: string;
  current_period_end: string | null;
  created_at: string;
}

export const PLATFORM_CONFIG: Record<
  Platform,
  { name: string; color: string; maxChars: number }
> = {
  twitter: {
    name: "Twitter / X",
    color: "#1DA1F2",
    maxChars: 280,
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0A66C2",
    maxChars: 3000,
  },
  instagram: {
    name: "Instagram",
    color: "#E1306C",
    maxChars: 2200,
  },
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    maxChars: 63206,
  },
  tiktok: {
    name: "TikTok",
    color: "#ff0050",
    maxChars: 2200,
  },
};

export const PLATFORM_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  pro: 5,
  business: 5,
};

export const POST_LIMITS: Record<SubscriptionTier, number> = {
  free: 10,
  pro: Infinity,
  business: Infinity,
};

export const AI_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 100,
  business: Infinity,
};

export const ALL_PLATFORMS: Platform[] = [
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
];
