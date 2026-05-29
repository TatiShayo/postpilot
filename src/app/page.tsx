"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing-navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Share2,
  Users,
  Send,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Clock,
  TrendingUp,
  Globe,
  Shield,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const features = [
  {
    icon: Sparkles,
    title: "AI Content Generation",
    description:
      "Generate 30 days of platform-optimized posts in 60 seconds with our GPT-4 powered AI.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Drag-and-drop calendar to plan, preview, and schedule posts across all platforms.",
  },
  {
    icon: BarChart3,
    title: "Real Analytics",
    description:
      "Track impressions, engagement, and growth with beautiful, real-time charts.",
  },
  {
    icon: Share2,
    title: "Multi-Platform",
    description:
      "Twitter/X, LinkedIn, Instagram, Facebook, and TikTok — all from one dashboard.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, assign roles, and collaborate on content seamlessly.",
  },
  {
    icon: Send,
    title: "One-Click Sharing",
    description:
      "Share your posts directly to WhatsApp, email, and more with a single click.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic posting",
    features: [
      "1 social platform",
      "10 posts per month",
      "Basic scheduling",
      "Manual posting only",
    ],
    notIncluded: ["AI content generation", "Analytics", "Team members"],
    cta: "Start Free",
    href: "/auth/signup",
    highlighted: false,
    priceId: null,
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    description: "Everything you need to grow",
    features: [
      "5 social platforms",
      "Unlimited posts",
      "AI content generation (100/mo)",
      "Advanced scheduling",
      "Calendar view",
    ],
    notIncluded: ["Team members (add-on)", "White-label"],
    cta: "Start Pro Trial",
    href: "/api/stripe/checkout?plan=pro",
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    name: "Business",
    price: "$29",
    period: "/month",
    description: "For agencies and teams",
    features: [
      "All 5 platforms",
      "Unlimited posts & AI",
      "Advanced analytics",
      "3 team members",
      "White-label reports",
      "Priority support",
    ],
    notIncluded: [],
    cta: "Start Business Trial",
    href: "/api/stripe/checkout?plan=business",
    highlighted: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
];

const comparisonColumns = [
  { name: "", postpilot: "PostPilot", hootsuite: "Hootsuite", buffer: "Buffer" },
  {
    name: "Starting Price",
    postpilot: "$15/mo",
    hootsuite: "$99/mo",
    buffer: "$36/mo",
  },
  { name: "AI Content", postpilot: "Included", hootsuite: "Add-on", buffer: "Basic" },
  {
    name: "Platforms",
    postpilot: "5 platforms",
    hootsuite: "10 platforms",
    buffer: "3 platforms",
  },
  {
    name: "Analytics",
    postpilot: "Advanced",
    hootsuite: "Advanced",
    buffer: "Limited",
  },
  {
    name: "Team Members",
    postpilot: "Up to 3 (Business)",
    hootsuite: "5+ (Enterprise)",
    buffer: "None on basic",
  },
  { name: "Free Plan", postpilot: "Yes", hootsuite: "No", buffer: "Yes" },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel your subscription at any time with one click. There are no long-term contracts or cancellation fees. Your account will remain active until the end of your billing period.",
  },
  {
    q: "Which social platforms do you support?",
    a: "We support Twitter/X, LinkedIn, Instagram, Facebook, and TikTok. We're constantly working on adding more platforms based on user demand.",
  },
  {
    q: "Is there really a free plan?",
    a: "Yes! Our free plan lets you connect 1 platform and publish up to 10 posts per month. It's perfect for solopreneurs just getting started. No credit card required.",
  },
  {
    q: "How does the AI content generator work?",
    a: "Our AI is powered by GPT-4o-mini. You describe your business, choose your tone and goal, and it generates platform-optimized posts in seconds. Pro users get 100 AI generations per month, Business users get unlimited.",
  },
  {
    q: "Can I schedule posts in advance?",
    a: "Yes! Our calendar lets you schedule posts days, weeks, or even months in advance. You can see your entire content plan at a glance and make adjustments anytime.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No! You can start with our free plan without entering any payment information. Upgrade to Pro or Business when you're ready for more features.",
  },
];

const socialProof = [
  { name: "Bloom & Co", initials: "BC" },
  { name: "FitLife Studio", initials: "FL" },
  { name: "Green Eats", initials: "GE" },
  { name: "Pixel Craft", initials: "PC" },
  { name: "The Daily Hive", initials: "DH" },
];

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1c1c2e] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1c1c2e]/30 transition-colors"
      >
        <span className="font-medium text-sm">{faq.q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          toast.success("You're on the list! Check your inbox.");
          setEmail("");
        } else {
          const data = await res.json();
          toast.error(data.error || "Something went wrong.");
        }
      } catch {
        toast.error("Failed to join waitlist. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f]">
      <LandingNavbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 px-4 py-1.5 text-sm border-violet-500/30 bg-violet-500/5 text-violet-300"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Powered by GPT-4
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
              30 Days of Social Content{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                in 60 Seconds
              </span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Stop spending hours on social media. PostPilot&apos;s AI generates
              a full month of engaging, platform-optimized posts — while you
              focus on running your business.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleEmailSubmit}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0 w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xs text-zinc-600 mt-4"
          >
            No credit card required • Free plan available
          </motion.p>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-xl border border-[#1c1c2e] bg-[#111118] p-1 shadow-2xl shadow-violet-500/5">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1c1c2e]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-zinc-600 ml-2">
                  PostPilot — Dashboard
                </span>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {["Scheduled", "Published", "Connected", "AI Credits"].map(
                    (label, i) => (
                      <div
                        key={label}
                        className="rounded-lg bg-[#1c1c2e]/50 p-3"
                      >
                        <div className="text-[10px] text-zinc-500 mb-1">
                          {label}
                        </div>
                        <div className="text-lg font-bold">
                          {[12, 48, "3/5", "100"][i]}
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  {[
                    {
                      content: "Excited to launch our new product line! 🚀",
                      date: "Tomorrow",
                      color: "#1DA1F2",
                    },
                    {
                      content: "5 tips for small business owners...",
                      date: "Jun 2",
                      color: "#0A66C2",
                    },
                    {
                      content: "Behind the scenes at our office 📸",
                      date: "Jun 5",
                      color: "#E1306C",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1c1c2e]/30"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm truncate flex-1">
                        {item.content}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <motion.section
        {...fadeUp}
        className="py-12 border-y border-[#1c1c2e]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-zinc-500 mb-6">
            Trusted by 1,000+ small businesses
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
            {socialProof.map((company) => (
              <div
                key={company.name}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-400">
                    {company.initials}
                  </span>
                </div>
                <span className="text-xs text-zinc-600">{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-violet-500/30 bg-violet-500/5 text-violet-300"
            >
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to grow
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
              From AI-powered content creation to advanced analytics — PostPilot
              has all the tools to manage your social presence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group rounded-xl border border-[#1c1c2e] bg-[#111118] p-6 hover:border-violet-500/20 hover:bg-[#111118]/80 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <section id="compare" className="py-20 sm:py-28 bg-[#0c0c14]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-violet-500/30 bg-violet-500/5 text-violet-300"
            >
              Compare
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How we stack up
            </h2>
            <p className="mt-4 text-zinc-400">
              PostPilot delivers more value at a fraction of the cost.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="rounded-xl border border-[#1c1c2e] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c1c2e]">
                    <th className="text-left p-4 text-sm font-semibold text-zinc-300">
                      Feature
                    </th>
                    <th className="p-4 text-sm font-semibold text-center">
                      <span className="text-violet-400">PostPilot</span>
                    </th>
                    <th className="p-4 text-sm font-semibold text-center text-zinc-400">
                      Hootsuite
                    </th>
                    <th className="p-4 text-sm font-semibold text-center text-zinc-400">
                      Buffer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonColumns.slice(1).map((row, i) => (
                    <tr
                      key={row.name}
                      className={`border-b border-[#1c1c2e] ${
                        i % 2 === 0 ? "bg-[#111118]/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-zinc-300">
                        {row.name}
                      </td>
                      <td className="p-4 text-sm text-center">
                        <span className="text-violet-400 font-medium">
                          {row.postpilot}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-center text-zinc-400">
                        {row.hootsuite}
                      </td>
                      <td className="p-4 text-sm text-center text-zinc-400">
                        {row.buffer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-violet-500/30 bg-violet-500/5 text-violet-300"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-zinc-400">
              Start free, upgrade when you&apos;re ready.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-violet-500/40 bg-violet-500/5 ring-1 ring-violet-500/20"
                    : "border-[#1c1c2e] bg-[#111118]"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="self-start mb-4 bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-zinc-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-zinc-300"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-zinc-600"
                    >
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}>
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
                        : "border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400"
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VALUE PROPS BAR ===== */}
      <section className="py-16 border-y border-[#1c1c2e] bg-[#0c0c14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Zap, label: "60 second setup", sub: "Connect in under a minute" },
              { icon: Clock, label: "Save 10+ hrs/week", sub: "AI handles the writing" },
              { icon: TrendingUp, label: "3x engagement", sub: "Platform-optimized posts" },
              { icon: Shield, label: "Enterprise security", sub: "SOC 2 compliant" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                {...stagger}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="text-center"
              >
                <item.icon className="w-6 h-6 text-violet-400 mx-auto mb-3" />
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-violet-500/30 bg-violet-500/5 text-violet-300"
            >
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Got questions?
            </h2>
            <p className="mt-4 text-zinc-400">We&apos;ve got answers.</p>
          </motion.div>

          <motion.div {...fadeUp} className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <FAQItem faq={faq} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            {...fadeUp}
            className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-transparent p-10 sm:p-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to 10x your social media?
            </h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Join 1,000+ small businesses already using PostPilot to automate
              their social presence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="outline" size="lg" className="border-[#1c1c2e]">
                  View Pricing
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
