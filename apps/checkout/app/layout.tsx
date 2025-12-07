import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // <-- IMPORT THIS
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ... metadata ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Load Razorpay Script */}
        <Script
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js"
        />
      </body>
    </html>
  );
}
