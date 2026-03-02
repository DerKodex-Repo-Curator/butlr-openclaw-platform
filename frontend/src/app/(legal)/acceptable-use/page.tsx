import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
};

export default function Page() {
  return <ClientPage />;
}
