import { VisibleViewport } from "@/components/visible-viewport";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./refinements.css";
import "./controls.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  title: "Daymark | A little more progress",
  description:
    "Manage your projects, tasks, and progress across web and mobile.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <VisibleViewport />
          {children}
        </Providers>
      </body>
    </html>
  );
}
