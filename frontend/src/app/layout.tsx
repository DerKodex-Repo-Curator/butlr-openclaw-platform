import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://butlr.cloud"),
  title: {
    default: "Butlr — Your Personal AI Butler on Telegram",
    template: "%s | Butlr",
  },
  description:
    "Not just another chatbot. Butlr is your AI with its own computer — it browses the web, manages files, and automates tasks. All through Telegram. Connect ChatGPT Plus or Claude Pro.",
  keywords: [
    "AI butler",
    "AI assistant",
    "Telegram bot",
    "personal AI",
    "automation",
    "ChatGPT Telegram",
    "Claude Telegram",
    "AI agent",
    "personal assistant bot",
    "BYOK AI",
  ],
  authors: [{ name: "Butlr", url: "https://butlr.cloud" }],
  creator: "Butlr",
  publisher: "Butlr",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Butlr — Your Personal AI Butler on Telegram",
    description:
      "Not just another chatbot. Your AI with its own computer. Browse, automate, and get things done — all through Telegram.",
    url: "https://butlr.cloud",
    siteName: "Butlr",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Butlr — Your Personal AI Butler on Telegram",
    description:
      "Your AI with its own computer. Browse, automate, and get things done — all through Telegram.",
    creator: "@butlrcloud",
  },
  alternates: {
    canonical: "https://butlr.cloud",
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Butlr",
  description:
    "Personal AI butler with its own computer, accessible through Telegram. Browse the web, manage files, automate tasks.",
  url: "https://butlr.cloud",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Telegram",
  offers: {
    "@type": "Offer",
    price: "14.99",
    priceCurrency: "EUR",
    priceValidUntil: "2027-12-31",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          defer
          src="/u/script.js"
          data-website-id="f75c5157-c9a8-4adb-b752-7b7af92b8779"
          data-host-url="/u"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
