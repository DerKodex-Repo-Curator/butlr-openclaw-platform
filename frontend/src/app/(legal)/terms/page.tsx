import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function Page() {
  return <ClientPage />;
}
