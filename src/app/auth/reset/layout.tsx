import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — PostPilot",
  description: "Reset your PostPilot account password.",
};

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
