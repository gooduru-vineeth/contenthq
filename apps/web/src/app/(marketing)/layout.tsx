import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ContentHQ - AI-Powered Content Generation Platform",
  description:
    "Transform raw content into polished videos with a 7-stage AI pipeline. Multi-provider AI, 6 TTS providers, visual flow builder, and more.",
  openGraph: {
    title: "ContentHQ - AI-Powered Content Generation Platform",
    description:
      "Transform raw content into polished videos with a 7-stage AI pipeline.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
