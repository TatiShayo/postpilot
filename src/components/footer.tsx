import Link from "next/link";
import { Sparkles } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
  Connect: [
    { label: "Twitter", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "Email", href: "mailto:hello@postpilot.app" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[#1c1c2e] bg-[#09090f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                Post<span className="text-violet-400">Pilot</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered social media management for small businesses. Plan a
              month of content in minutes.
            </p>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-semibold text-sm mb-4 text-zinc-300">
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1c1c2e] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} PostPilot. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm">
              Privacy
            </Link>
            <Link href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm">
              Terms
            </Link>
            <Link href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
