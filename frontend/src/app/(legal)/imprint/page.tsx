import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Legal Notice (Imprint)",
};

export default function Page() {
  return <ClientPage />;
}
