"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Bell, Users, Code, Loader2 } from "lucide-react";

const settingTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "api", label: "API", icon: Code },
];

export default function SettingsPage() {
  const supabase = createClient();
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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
  };

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
