import { describe, it, expect } from "vitest";
import {
  canTransitionCampaign,
  getValidNextStates,
  validateCampaignPrerequisites,
  transitionCampaign,
  CAMPAIGN_TRANSITIONS,
} from "@/lib/campaign-state-machine";
import type { Campaign, CampaignStatus } from "@/lib/types";

function createMockCampaign(status: CampaignStatus = "draft"): Campaign {
  return {
    id: "camp-123",
    user_id: "user-1",
    title: "Summer Newsletter Launch",
    subject: "Hot Deals This Summer ☀️",
    preview_text: "Don't miss our summer sale",
    content_html: "<h1>Summer Sale</h1><p>Enjoy 20% off all plans!</p>",
    status,
    target_tags: ["newsletter"],
    total_recipients: 100,
    sent_count: 0,
    failed_count: 0,
    created_at: "2026-08-01T00:00:00Z",
  };
}

describe("canTransitionCampaign — Transition Matrix", () => {
  it("allows all valid transitions from draft", () => {
    expect(canTransitionCampaign("draft", "scheduled")).toBe(true);
    expect(canTransitionCampaign("draft", "queued")).toBe(true);
    expect(canTransitionCampaign("draft", "canceled")).toBe(true);
    expect(canTransitionCampaign("draft", "archived")).toBe(true);
  });

  it("blocks illegal transitions from draft", () => {
    expect(canTransitionCampaign("draft", "sending")).toBe(false);
    expect(canTransitionCampaign("draft", "completed")).toBe(false);
    expect(canTransitionCampaign("draft", "failed")).toBe(false);
  });

  it("allows scheduling, unscheduling and queuing transitions", () => {
    expect(canTransitionCampaign("scheduled", "draft")).toBe(true); // unschedule
    expect(canTransitionCampaign("scheduled", "queued")).toBe(true);
    expect(canTransitionCampaign("scheduled", "sending")).toBe(true);
    expect(canTransitionCampaign("scheduled", "canceled")).toBe(true);
    expect(canTransitionCampaign("scheduled", "completed")).toBe(false);
  });

  it("handles sending and completion transitions", () => {
    expect(canTransitionCampaign("sending", "completed")).toBe(true);
    expect(canTransitionCampaign("sending", "paused")).toBe(true);
    expect(canTransitionCampaign("sending", "failed")).toBe(true);
    expect(canTransitionCampaign("sending", "canceled")).toBe(true);
    expect(canTransitionCampaign("sending", "draft")).toBe(false);
  });

  it("allows retrying failed campaigns by moving to queued or draft", () => {
    expect(canTransitionCampaign("failed", "queued")).toBe(true);
    expect(canTransitionCampaign("failed", "draft")).toBe(true);
    expect(canTransitionCampaign("failed", "archived")).toBe(true);
    expect(canTransitionCampaign("failed", "completed")).toBe(false);
  });

  it("allows restoring archived campaigns to draft", () => {
    expect(canTransitionCampaign("archived", "draft")).toBe(true);
    expect(canTransitionCampaign("archived", "sending")).toBe(false);
    expect(canTransitionCampaign("archived", "completed")).toBe(false);
  });

  it("permits self-transitions (idempotency)", () => {
    expect(canTransitionCampaign("draft", "draft")).toBe(true);
    expect(canTransitionCampaign("sending", "sending")).toBe(true);
  });
});

describe("getValidNextStates", () => {
  it("returns correct next states list for all statuses", () => {
    for (const [status, expected] of Object.entries(CAMPAIGN_TRANSITIONS)) {
      const nextStates = getValidNextStates(status as CampaignStatus);
      expect(nextStates).toEqual(expected);
    }
  });
});

describe("validateCampaignPrerequisites", () => {
  it("passes for complete draft campaign moving to queued", () => {
    const campaign = createMockCampaign("draft");
    const result = validateCampaignPrerequisites(campaign, "queued");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when attempting to schedule without title, subject, or body", () => {
    const invalidCampaign: Campaign = {
      ...createMockCampaign("draft"),
      title: "",
      subject: "",
      content_html: "",
      scheduled_at: null,
    };
    const result = validateCampaignPrerequisites(invalidCampaign, "scheduled");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Campaign must have a title.");
    expect(result.errors).toContain("Campaign must have an email subject line.");
    expect(result.errors).toContain("Campaign must have HTML email body content.");
    expect(result.errors).toContain(
      "Scheduled campaigns must specify a scheduled_at date/time."
    );
  });

  it("fails on illegal state transitions", () => {
    const campaign = createMockCampaign("completed");
    const result = validateCampaignPrerequisites(campaign, "sending");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Illegal campaign state transition");
  });
});

describe("transitionCampaign — Execution & Audit Trail", () => {
  it("executes valid transition and records audit history in metadata", () => {
    const campaign = createMockCampaign("draft");
    const scheduled = transitionCampaign(campaign, "scheduled", {
      scheduledAt: "2026-09-01T09:00:00Z",
      reason: "User scheduled campaign for September 1",
      actorId: "user-1",
    });

    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.scheduled_at).toBe("2026-09-01T09:00:00Z");
    expect(scheduled.metadata?.history).toHaveLength(1);
    expect((scheduled.metadata?.history as any)[0]).toEqual(
      expect.objectContaining({
        from: "draft",
        to: "scheduled",
        reason: "User scheduled campaign for September 1",
        actorId: "user-1",
      })
    );
  });

  it("chains multiple state transitions accumulating audit history", () => {
    const draft = createMockCampaign("draft");
    const queued = transitionCampaign(draft, "queued", { reason: "Queued for dispatch" });
    const sending = transitionCampaign(queued, "sending", { reason: "Sending started" });
    const completed = transitionCampaign(sending, "completed", { reason: "All emails sent" });

    expect(completed.status).toBe("completed");
    expect(completed.sent_at).toBeDefined();
    expect(completed.metadata?.history).toHaveLength(3);
  });

  it("throws error when invalid transition is attempted", () => {
    const campaign = createMockCampaign("draft");
    expect(() => transitionCampaign(campaign, "completed")).toThrow(
      /Cannot transition campaign/
    );
  });

  it("returns campaign unchanged when transitioning to same status", () => {
    const campaign = createMockCampaign("draft");
    const result = transitionCampaign(campaign, "draft");
    expect(result).toBe(campaign);
  });
});
