import { NextResponse } from "next/server";
import { siteUrl } from "@/constants/siteUrl";

export async function POST() {
  // Redirect to login page
  // The frontend will handle clearing tokens and cookies
  return NextResponse.redirect(`${siteUrl}/login`, {
    status: 301,
  });
}
