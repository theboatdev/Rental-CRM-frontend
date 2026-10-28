import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";

export const metadata: Metadata = { title: "Book a vehicle" };

/** The public booking page of a tenant with the guest portal on. No sign-in (see proxy.ts). */
export default async function Page({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  return <BookingPage slug={slug} />;
}
