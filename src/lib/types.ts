export type SubscriptionTier = "free" | "pro" | "business";

export type Platform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "tiktok";

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "sending"
  | "paused"
  | "completed"
  | "failed"
  | "canceled"
  | "archived";

export type SubscriberStatus =
  | "active"
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "pending";

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

export interface Subscriber {
  id: string;
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  tags: string[];
  status: SubscriberStatus;
  engagement_score: number;
  custom_fields?: Record<string, string | number | boolean | null>;
  unsubscribe_token?: string | null;
  subscribed_at: string;
  unsubscribed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  variables: string[];
  category?: string;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  preview_text?: string | null;
  content_html: string;
  content_text?: string | null;
  template_id?: string | null;
  status: CampaignStatus;
  target_tags: string[];
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface EmailDeliveryJob {
  id: string;
  campaign_id: string;
  subscriber_id: string;
  recipient_email: string;
  rendered_subject: string;
  rendered_html: string;
  rendered_text?: string;
  status: "pending" | "sent" | "failed" | "retried";
  error?: string;
  attempts: number;
  last_attempt_at?: string;
  sent_at?: string;
}

export interface SubscriberFilter {
  tags?: string[];
  tagMatchMode?: "all" | "any" | "none";
  status?: SubscriberStatus | SubscriberStatus[];
  search?: string;
  minEngagement?: number;
  maxEngagement?: number;
  createdAfter?: string;
  createdBefore?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface QueueBatchResult {
  batchId: string;
  total: number;
  succeeded: number;
  failed: number;
  durationMs: number;
  errors: Array<{ recipient: string; error: string; permanent: boolean }>;
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
