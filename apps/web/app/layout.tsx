import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"] });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const metadata: Metadata = {
    title: "Hypechart",
    description: "The Hypechart Flow",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${outfit.className} antialiased`}>{children}</body>
        </html>
    );
}
