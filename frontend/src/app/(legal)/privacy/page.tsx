import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function Page() {
  return <ClientPage />;
}
