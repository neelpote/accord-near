import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import "./editorial.css";
export const metadata: Metadata = {
  title: "Accord · Know what changed.",
  description:
    "Finite, cancellable recurring purchases for agent services on NEAR testnet.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
