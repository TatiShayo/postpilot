"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Copy,
  Megaphone,
  Heart,
  Camera,
  Lightbulb,
  MessageSquare,
  AlertCircle,
  Star,
  Gift,
  Users,
  Calendar,
  TrendingUp,
  BookOpen,
  PartyPopper,
  Award,
  ThumbsUp,
  Zap,
  Target,
  Globe,
  Smile,
} from "lucide-react";
import type { Platform } from "@/lib/types";

type Template = {
  icon: React.ElementType;
  title: string;
  category: string;
  platforms: Platform[];
  structure: string;
  example: string;
};

const templates: Template[] = [
  {
    icon: Megaphone,
    title: "Product Launch",
    category: "Marketing",
    platforms: ["twitter", "linkedin", "instagram"],
    structure: "1. Tease the launch\n2. Reveal the product\n3. Highlight key features\n4. Call to action\n5. Link to learn more",
    example: "The wait is over! 🚀 Introducing [Product Name] — the [solution] you've been waiting for. Here's what makes it different:\n\n✨ Feature 1\n✨ Feature 2\n✨ Feature 3\n\nEarly access available now at [link]",
  },
  {
    icon: Heart,
    title: "Customer Testimonial",
    category: "Social Proof",
    platforms: ["linkedin", "facebook", "instagram"],
    structure: "1. Customer quote\n2. Pain point they faced\n3. How you helped\n4. Results they got\n5. CTA for others",
    example: '"Working with [Company] completely transformed our workflow."\n\nWhen [Customer] came to us, they were spending 10 hours/week on manual tasks.\n\nAfter 30 days, they cut that down to 2 hours and increased output by 40%.\n\nWant results like these? DM us "RESULTS" to learn more.',
  },
  {
    icon: Camera,
    title: "Behind the Scenes",
    category: "Culture",
    platforms: ["instagram", "tiktok", "facebook"],
    structure: "1. Hook: show something exclusive\n2. Show the process\n3. Add personality/team\n4. CTA: follow for more",
    example: "Ever wonder how we [do X]? 👀\n\nHere's a peek behind the curtain at [Company]. From early morning [activity] to [result], here's what a typical day looks like.\n\nFollow us for more behind-the-scenes content!",
  },
  {
    icon: Lightbulb,
    title: "Quick Tip",
    category: "Education",
    platforms: ["twitter", "linkedin", "tiktok"],
    structure: "1. Hook with the problem\n2. Reveal the tip\n3. Explain why it works\n4. Encourage to try",
    example: "Struggling with [common problem]?\n\nHere's a quick fix: [one actionable tip].\n\nWhy it works: [brief explanation].\n\nTry it today and let us know how it goes! 💡",
  },
  {
    icon: MessageSquare,
    title: "Poll / Engagement",
    category: "Community",
    platforms: ["twitter", "linkedin", "facebook"],
    structure: "1. Ask an opinion question\n2. Give 2-3 options\n3. Promise to share results\n4. Follow-up post with results",
    example: "We're curious... 🤔\n\nWhich matters more for your business right now?\nA) Growing your audience\nB) Improving your product\nC) Increasing revenue\n\nVote below — we'll share the results tomorrow!",
  },
  {
    icon: AlertCircle,
    title: "Industry Myth Buster",
    category: "Education",
    platforms: ["linkedin", "twitter"],
    structure: "1. State the common myth\n2. Bust it with facts/data\n3. Share the truth\n4. Ask for thoughts",
    example: "MYTH: [Common industry misconception].\n\nFACT: Here's what the data actually shows: [real insight].\n\nStop believing [myth]. Start focusing on [what actually works].\n\nAgree? Disagree? Let's discuss in the comments.",
  },
  {
    icon: Star,
    title: "Milestone Celebration",
    category: "Culture",
    platforms: ["linkedin", "instagram", "facebook"],
    structure: "1. Announce the milestone\n2. Thank your community\n3. Share the journey briefly\n4. Look forward",
    example: "We just hit [milestone]! 🎉\n\nThis wouldn't be possible without YOU — our amazing community.\n\nA year ago, we [where you started]. Today, [where you are].\n\nAnd we're just getting started...",
  },
  {
    icon: Gift,
    title: "Announcement / News",
    category: "Marketing",
    platforms: ["twitter", "linkedin", "instagram", "facebook"],
    structure: "1. Big news headline\n2. What's changing/coming\n3. Why it matters\n4. When it's available\n5. CTA",
    example: "BIG NEWS! 📢\n\nStarting [date], we're launching [new feature/product].\n\nThis means you can now [benefit].\n\nStay tuned for more details, or sign up early at [link].",
  },
  {
    icon: Users,
    title: "Team Spotlight",
    category: "Culture",
    platforms: ["linkedin", "instagram"],
    structure: "1. Introduce the team member\n2. Share their role\n3. Fun fact / quote\n4. Link to connect",
    example: "Meet [Name], our [Role]! 👋\n\n[Name] has been with us for [time] and is the mastermind behind [project/feature].\n\nFun fact: [interesting tidbit].\n\nWant to join our team? We're hiring! [link]",
  },
  {
    icon: Calendar,
    title: "Weekly Recap",
    category: "Community",
    platforms: ["linkedin", "facebook"],
    structure: "1. Weekly roundup intro\n2. 3-5 highlights with bullet points\n3. Key takeaway\n4. What's coming next week",
    example: "Your weekly [Company] roundup 📋\n\nThis week:\n• Shipped [feature]\n• Welcomed [new person]\n• Published [article/link]\n\nKey insight: [one lesson learned]\n\nNext week: [tease something]",
  },
  {
    icon: TrendingUp,
    title: "Case Study Preview",
    category: "Social Proof",
    platforms: ["linkedin", "twitter"],
    structure: "1. Hook with the results\n2. Quick context\n3. Key numbers\n4. Link to full case study",
    example: "[Client] achieved [impressive result] in just [timeframe]. 📈\n\nHere's how: [brief method summary]\n\n• Before: [metric]\n• After: [metric]\n• ROI: [percentage]\n\nRead the full case study → [link]",
  },
  {
    icon: BookOpen,
    title: "Story / Thread",
    category: "Education",
    platforms: ["twitter", "linkedin"],
    structure: "1. Opening hook\n2. Set up the story\n3. Build tension/challenge\n4. Resolution\n5. Key lesson",
    example: "Thread: How we went from [starting point] to [success metric] in [timeframe]. 🧵\n\n1/6 Two years ago, [set the scene]. We were struggling with [problem].\n\n2/6 Then we tried [key insight/change]...",
  },
  {
    icon: PartyPopper,
    title: "Contest / Giveaway",
    category: "Marketing",
    platforms: ["instagram", "facebook", "twitter"],
    structure: "1. Announce the giveaway\n2. Prize details\n3. Entry rules\n4. Deadline\n5. Good luck",
    example: "GIVEAWAY TIME! 🎁\n\nWe're giving away [prize] to one lucky follower!\n\nTo enter:\n1️⃣ Like this post\n2️⃣ Follow @[handle]\n3️⃣ Tag 2 friends in comments\n\nWinner announced [date]. Good luck!",
  },
  {
    icon: Target,
    title: "How-To Guide",
    category: "Education",
    platforms: ["linkedin", "instagram", "tiktok"],
    structure: "1. The result they'll get\n2. Step 1-3 in order\n3. Pro tip\n4. Save/bookmark CTA",
    example: "How to [achieve specific result] in 3 easy steps:\n\nStep 1: [action]\nStep 2: [action]\nStep 3: [action]\n\n⚡ Pro tip: [extra insight]\n\nSave this for later! 🔖",
  },
  {
    icon: ThumbsUp,
    title: "Before & After",
    category: "Social Proof",
    platforms: ["instagram", "facebook", "linkedin"],
    structure: "1. Present the before situation\n2. Show the after/result\n3. What changed\n4. Invite to learn more",
    example: "Before: [describe old state]\nAfter: [describe improved state] ✨\n\nWhat changed? [key factor/method]\n\nReady for your transformation? Let's talk. 👇",
  },
  {
    icon: Zap,
    title: "Reactive / Trend Jump",
    category: "Community",
    platforms: ["twitter", "linkedin", "tiktok"],
    structure: "1. Reference the trend/news\n2. Your take/hot opinion\n3. Relate it to your niche\n4. Ask: what do you think?",
    example: "Everyone's talking about [trend/news]. Here's my take:\n\n[Your unique perspective].\n\nHere's why this matters for [your industry].\n\nHot take or nah? Let me know below. 👇",
  },
  {
    icon: Award,
    title: "Expert Roundup",
    category: "Education",
    platforms: ["linkedin", "twitter"],
    structure: "1. Pose a compelling question\n2. Share 3-5 expert takes\n3. Summarize the consensus\n4. Ask for more contributions",
    example: "I asked [number] [industry] experts one question:\n\n\"What's the #1 mistake you see [audience] making?\"\n\nHere's what they said:\n\n[Expert 1]: \"...\"\n[Expert 2]: \"...\"\n[Expert 3]: \"...\"\n\nThe consensus? [summary]\n\nWhat would you add?",
  },
  {
    icon: Globe,
    title: "Industry Report Breakdown",
    category: "Education",
    platforms: ["linkedin", "twitter"],
    structure: "1. Name the report\n2. 3 surprising stats\n3. What it means\n4. Your prediction",
    example: "The [year] [Industry] Report just dropped. 📊\n\n3 stats that caught my eye:\n1. [Stat 1]\n2. [Stat 2]\n3. [Stat 3]\n\nWhat this means: [analysis]\n\nMy prediction: [bold take]\n\nWhat's your take?",
  },
  {
    icon: Smile,
    title: "Fun / Relatable",
    category: "Culture",
    platforms: ["twitter", "instagram", "tiktok", "facebook"],
    structure: "1. Relatable situation\n2. Exaggerated/funny take\n3. Punchline\n4. Tag a friend",
    example: "When you [relatable scenario] and [funny consequence] 😅\n\nName a more iconic duo. I'll wait.\n\nTag someone who needs to see this 👇",
  },
  {
    icon: Copy,
    title: "Quote / Inspiration",
    category: "Culture",
    platforms: ["instagram", "linkedin", "twitter"],
    structure: "1. Powerful quote\n2. Attribution\n3. Why it resonates\n4. Ask followers to share",
    example: "\"The best time to plant a tree was 20 years ago. The second best time is now.\"\n— Chinese Proverb\n\nThis hits different when you're building a business.\n\nShare this with someone who needs to hear it today. 🌱",
  },
];

const categoryNames = Array.from(new Set(templates.map((t) => t.category)));

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  const copyTemplate = (template: Template) => {
    const text = `${template.title}\n\n${template.structure}\n\nExample:\n${template.example}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Template copied! Paste it into Compose.");
    });
  };

  const applyTemplate = (template: Template) => {
    sessionStorage.setItem(
      "composeTemplate",
      JSON.stringify({ content: template.example, platforms: template.platforms })
    );
    router.push("/dashboard/compose");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post Templates</h1>
        <p className="text-zinc-400 mt-1">
          Click any template to fill it into the composer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={!selectedCategory ? "bg-violet-500/20 text-violet-300" : "border-[#1c1c2e] text-zinc-400"}
        >
          All
        </Button>
        {categoryNames.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? "bg-violet-500/20 text-violet-300" : "border-[#1c1c2e] text-zinc-400"}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template, i) => (
          <Card
            key={i}
            className="bg-[#111118] border-[#1c1c2e] hover:border-violet-500/20 cursor-pointer transition-all group"
            onClick={() => copyTemplate(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <template.icon className="w-4 h-4 text-violet-400" />
                <CardTitle className="text-sm font-semibold">{template.title}</CardTitle>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {template.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                    {p}
                  </Badge>
                ))}
                <Badge className="text-[10px] bg-violet-500/10 text-violet-400 border-0">
                  {template.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                {template.example.substring(0, 150)}...
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-[#1c1c2e] h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyTemplate(template);
                  }}
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
