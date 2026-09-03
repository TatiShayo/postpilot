import type { Campaign, CampaignStatus } from "./types";

/**
 * Permitted State Transitions for Campaigns
 */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  draft: ["scheduled", "queued", "canceled", "archived"],
  scheduled: ["draft", "queued", "sending", "paused", "canceled"],
  queued: ["sending", "paused", "canceled", "failed"],
  sending: ["completed", "paused", "failed", "canceled"],
  paused: ["sending", "canceled", "draft"],
  completed: ["archived"],
  failed: ["queued", "draft", "archived"],
  canceled: ["draft", "archived"],
  archived: ["draft"], // Allows restoring an archived campaign back to draft
} as const;

export interface StateTransitionAudit {
  from: CampaignStatus;
  to: CampaignStatus;
  timestamp: string;
  reason?: string;
  actorId?: string;
}

export interface TransitionOptions {
  reason?: string;
  actorId?: string;
  scheduledAt?: string;
  totalRecipients?: number;
}

/**
 * Returns whether a transition from one state to another is allowed
 */
export function canTransitionCampaign(
  fromStatus: CampaignStatus,
  toStatus: CampaignStatus
): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = CAMPAIGN_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Returns all valid next states from the current status
 */
export function getValidNextStates(currentStatus: CampaignStatus): CampaignStatus[] {
  return [...(CAMPAIGN_TRANSITIONS[currentStatus] || [])];
}

/**
 * Validates campaign invariants, payload readiness, CRLF / header injection safety, and arithmetic bounds
 */
export function validateCampaignPrerequisites(
  campaign: Campaign,
  targetStatus: CampaignStatus,
  options?: TransitionOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!campaign || typeof campaign !== "object") {
    return { valid: false, errors: ["Invalid campaign object."] };
  }

  // Check state machine validity
  if (!canTransitionCampaign(campaign.status, targetStatus)) {
    errors.push(
      `Illegal campaign state transition from "${campaign.status}" to "${targetStatus}".`
    );
    return { valid: false, errors };
  }

  // Pre-requisites for scheduling, queuing, or sending
  if (targetStatus === "scheduled" || targetStatus === "queued" || targetStatus === "sending") {
    if (!campaign.title || typeof campaign.title !== "string" || campaign.title.trim() === "") {
      errors.push("Campaign must have a title.");
    }
    if (!campaign.subject || typeof campaign.subject !== "string" || campaign.subject.trim() === "") {
      errors.push("Campaign must have an email subject line.");
    } else if (/[\r\n\x00-\x1F\x7F]/.test(campaign.subject)) {
      // Header Injection / CRLF Defense
      errors.push("Campaign subject line cannot contain CRLF or control characters.");
    }

    if (!campaign.content_html || typeof campaign.content_html !== "string" || campaign.content_html.trim() === "") {
      errors.push("Campaign must have HTML email body content.");
    }
  }

  if (targetStatus === "scheduled") {
    const schedAt = options?.scheduledAt || campaign.scheduled_at;
    if (!schedAt) {
      errors.push("Scheduled campaigns must specify a scheduled_at date/time.");
    } else {
      const scheduledTime = new Date(schedAt).getTime();
      if (!Number.isFinite(scheduledTime)) {
        errors.push("Invalid scheduled_at date format.");
      }
    }
  }

  if (options?.totalRecipients !== undefined) {
    if (!Number.isFinite(options.totalRecipients) || options.totalRecipients < 0) {
      errors.push("Total recipients must be a valid non-negative number.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Performs a validated campaign state transition, maintaining audit history
 */
export function transitionCampaign(
  campaign: Campaign,
  toStatus: CampaignStatus,
  options: TransitionOptions = {}
): Campaign {
  const validation = validateCampaignPrerequisites(campaign, toStatus, options);
  if (!validation.valid) {
    throw new Error(
      `Cannot transition campaign "${campaign.id}": ${validation.errors.join("; ")}`
    );
  }

  if (campaign.status === toStatus) {
    return campaign;
  }

  const now = new Date().toISOString();
  const currentHistory: StateTransitionAudit[] = Array.isArray(
    (campaign.metadata as any)?.history
  )
    ? (campaign.metadata as any).history
    : [];

  const newAudit: StateTransitionAudit = {
    from: campaign.status,
    to: toStatus,
    timestamp: now,
    reason: options.reason,
    actorId: options.actorId,
  };

  const updatedMetadata = {
    ...campaign.metadata,
    history: [...currentHistory, newAudit],
    lastTransitionAt: now,
  };

  const updated: Campaign = {
    ...campaign,
    status: toStatus,
    updated_at: now,
    metadata: updatedMetadata,
  };

  // State-specific attribute updates
  if (toStatus === "scheduled" && options.scheduledAt) {
    updated.scheduled_at = options.scheduledAt;
  }
  if (toStatus === "sending" && !campaign.sent_at) {
    updated.sent_at = now;
  }
  if (toStatus === "completed" && !campaign.sent_at) {
    updated.sent_at = now;
  }
  if (options.totalRecipients !== undefined && Number.isFinite(options.totalRecipients)) {
    updated.total_recipients = Math.max(0, Math.floor(options.totalRecipients));
  }

  return updated;
}
