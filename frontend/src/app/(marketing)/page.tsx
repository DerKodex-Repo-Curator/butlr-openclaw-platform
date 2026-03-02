import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "Butlr — Your Personal AI Butler on Telegram",
  description:
    "Not just another chatbot. Butlr is your AI with its own computer — it browses the web, manages files, and automates tasks. All through Telegram. From €14.99/mo.",
};

export default function HomePage() {
  return <LandingClient />;
}
