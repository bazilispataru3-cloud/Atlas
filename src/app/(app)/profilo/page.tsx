import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/profile-page";

export const metadata: Metadata = { title: "Profilo e impostazioni" };

export default function Page() {
  return <ProfilePage />;
}
