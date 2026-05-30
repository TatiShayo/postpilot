import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — PostPilot",
  description: "Sign in to your PostPilot account to manage your social media content.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
