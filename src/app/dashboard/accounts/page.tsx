"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PLATFORM_COLORS } from "@/lib/constants";
import type { Platform, SocialAccount } from "@/lib/types";
import { ALL_PLATFORMS } from "@/lib/types";
import { Link2, Plus, Loader2, Trash2 } from "lucide-react";

const platformIcons: Record<Platform, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📷",
  facebook: "𝒇",
  tiktok: "🎵",
};

const platformNames: Record<Platform, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default function AccountsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectModal, setConnectModal] = useState<Platform | null>(null);
  const [connectUsername, setConnectUsername] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    setAccounts(data ?? []);
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!connectModal || !connectUsername.trim()) return;
    setConnecting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Check if account already exists
    const existing = accounts.find(
      (a) => a.platform === connectModal
    );

    if (existing) {
      const { error } = await supabase
        .from("social_accounts")
        .update({
          username: connectUsername.trim(),
          display_name: connectUsername.trim(),
          is_connected: true,
          followers_count: Math.floor(Math.random() * 10000) + 100,
        })
        .eq("id", existing.id);

      if (error) {
        toast.error("Failed to connect");
      } else {
        toast.success(`Connected to ${platformNames[connectModal]}!`);
      }
    } else {
      const { error } = await supabase.from("social_accounts").insert({
        user_id: user.id,
        platform: connectModal,
        username: connectUsername.trim(),
        display_name: connectUsername.trim(),
        is_connected: true,
        followers_count: Math.floor(Math.random() * 10000) + 100,
      });

      if (error) {
        toast.error("Failed to connect");
      } else {
        toast.success(`Connected to ${platformNames[connectModal]}!`);
      }
    }

    setConnecting(false);
    setConnectModal(null);
    setConnectUsername("");
    fetchAccounts();
  };

  const handleDisconnect = async (accountId: string) => {
    const { error } = await supabase
      .from("social_accounts")
      .update({ is_connected: false })
      .eq("id", accountId);

    if (error) {
      toast.error("Failed to disconnect");
    } else {
      toast.success("Account disconnected");
      fetchAccounts();
    }
  };

  const getAccountForPlatform = (platform: Platform) =>
    accounts.find((a) => a.platform === platform);

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
          Social Accounts
        </h1>
        <p className="text-zinc-400 mt-1">
          Connect and manage your social media platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_PLATFORMS.map((platform) => {
          const account = getAccountForPlatform(platform);
          const connected = account?.is_connected ?? false;

          return (
            <Card
              key={platform}
              className="bg-[#111118] border-[#1c1c2e] hover:border-[#2a2a42] transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                    >
                      {platformIcons[platform]}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {platformNames[platform]}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 ${
                          connected
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-700"
                        }`}
                      >
                        {connected ? (
                          <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </span>
                        ) : (
                          "Not Connected"
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {connected && account ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-zinc-400">@{account.username}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {account.followers_count?.toLocaleString() ?? 0}{" "}
                        followers
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDisconnect(account.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                    onClick={() => setConnectModal(platform)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={connectModal !== null}
        onOpenChange={() => {
          setConnectModal(null);
          setConnectUsername("");
        }}
      >
        <DialogContent className="bg-[#111118] border-[#1c1c2e] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-400" />
              Connect {connectModal ? platformNames[connectModal] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-zinc-400">
              OAuth integration is coming soon. For now, enter your handle
              manually to get started.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Username / Handle
              </label>
              <Input
                placeholder="@yourhandle"
                value={connectUsername}
                onChange={(e) => setConnectUsername(e.target.value)}
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting || !connectUsername.trim()}
              className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Connect Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
