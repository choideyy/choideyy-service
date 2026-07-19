import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choideyy Contact Service",
  description: "Backend API for Choideyy Contact Us form",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
