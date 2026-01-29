import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Synology Access Viewer",
  description: "View and manage Synology NAS access",
};

export default function SynologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}