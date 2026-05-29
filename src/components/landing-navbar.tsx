import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1c1c2e] bg-[#09090f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Post<span className="text-violet-400">Pilot</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-zinc-200 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-zinc-200 transition-colors">
            Pricing
          </Link>
          <Link href="#compare" className="hover:text-zinc-200 transition-colors">
            Compare
          </Link>
          <Link href="#faq" className="hover:text-zinc-200 transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-zinc-300">
              Log In
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0"
            >
              Start Free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
