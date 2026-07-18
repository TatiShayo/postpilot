"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Bell, Users, Code, Loader2, Gift, Copy } from "lucide-react";

const settingTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "referrals", label: "Referrals", icon: Gift },
  { id: "team", label: "Team", icon: Users },
  { id: "api", label: "API", icon: Code },
];

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  // Notification state
  const [emailDigest, setEmailDigest] = useState(true);
  const [postReminders, setPostReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name ?? "");
      setCompanyName(profile.company_name ?? "");
      setSubscriptionTier(profile.subscription_tier ?? "free");

      if (profile.full_name) {
        setUserInitials(
          profile.full_name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        );
      }
    }

    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem("postpilot-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setEmailDigest(parsed.emailDigest ?? true);
      setPostReminders(parsed.postReminders ?? true);
      setWeeklyReport(parsed.weeklyReport ?? false);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        company_name: companyName,
        subscription_tier: subscriptionTier,
      });

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated!");
    }

    setSaving(false);
  };

  const saveNotifications = () => {
    localStorage.setItem(
      "postpilot-settings",
      JSON.stringify({ emailDigest, postReminders, weeklyReport })
    );
    toast.success("Notification preferences saved!");
  };

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
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account and preferences.</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#1c1c2e]">
        {settingTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "profile" && (
        <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg bg-violet-500/20 text-violet-400">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm" className="border-[#1c1c2e]">
                  Upload Photo
                </Button>
                <p className="text-xs text-zinc-500 mt-1">
                  JPG or PNG, max 2MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your business"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                value={email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-zinc-500">
                Email can only be changed in account settings.
              </p>
            </div>

            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Email Digest",
                desc: "Receive a daily digest of your post performance.",
                checked: emailDigest,
                onChange: setEmailDigest,
              },
              {
                label: "Post Reminders",
                desc: "Get reminded before your scheduled posts go live.",
                checked: postReminders,
                onChange: setPostReminders,
              },
              {
                label: "Weekly Report",
                desc: "Receive a comprehensive weekly analytics report.",
                checked: weeklyReport,
                onChange: setWeeklyReport,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <Switch
                  checked={item.checked}
                  onCheckedChange={item.onChange}
                />
              </div>
            ))}
            <Button
              onClick={saveNotifications}
              className="mt-4 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
            >
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "referrals" && (
        <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Referral Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              Share your referral link and earn rewards. After 3 friends sign up, get 1 month of Pro for free!
            </p>

            <div className="bg-[#0c0c14] rounded-lg p-4 border border-[#1c1c2e]">
              <p className="text-xs text-zinc-500 mb-2">Your Referral Link</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`https://postpilot.app/auth/signup?ref=${email.split("@")[0]}`}
                  className="flex-1 text-sm font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#1c1c2e] shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://postpilot.app/auth/signup?ref=${email.split("@")[0]}`
                    );
                    toast.success("Referral link copied!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { count: "0/3", label: "Referrals", desc: "1 month free after 3" },
                { count: "Pro", label: "Reward", desc: "Upgrade applied automatically" },
                { count: "∞", label: "Stacking", desc: "Refer more, earn more" },
              ].map((item) => (
                <div key={item.label} className="text-center bg-[#0c0c14] rounded-lg p-3 border border-[#1c1c2e]">
                  <p className="text-xl font-bold text-violet-400">{item.count}</p>
                  <p className="text-xs text-zinc-400">{item.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-[#1c1c2e] text-xs"
                onClick={() => {
                  const url = encodeURIComponent(`https://postpilot.app/auth/signup?ref=${email.split("@")[0]}`);
                  const text = encodeURIComponent("I'm using PostPilot to manage my social media. Check it out!");
                  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank");
                }}
              >
                Share on X
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#1c1c2e] text-xs"
                onClick={() => {
                  const url = encodeURIComponent(`https://postpilot.app/auth/signup?ref=${email.split("@")[0]}`);
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
                }}
              >
                Share on LinkedIn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "team" && (
        <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionTier !== "business" ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm mb-1">
                  Team members are available on the Business plan.
                </p>
                <p className="text-zinc-600 text-xs">
                  Upgrade to Business to add up to 3 team members.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input placeholder="colleague@example.com" className="flex-1" />
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0"
                  >
                    Invite
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 text-center py-4">
                  No team members yet. Invite someone to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "api" && (
        <Card className="bg-[#111118] border-[#1c1c2e] max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">API Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Code className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm mb-1">
                API access coming soon.
              </p>
              <p className="text-zinc-600 text-xs">
                We&apos;re building a public API for developers. Stay tuned.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
