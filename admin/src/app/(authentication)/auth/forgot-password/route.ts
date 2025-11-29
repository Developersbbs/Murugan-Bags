import { NextResponse } from "next/server";

import { passwordResetFormSchema } from "@/app/(authentication)/forgot-password/_components/schema";
import validateFormData from "@/helpers/validateFormData";
import { siteUrl } from "@/constants/siteUrl";

export async function POST(request: Request) {
  // Get form fields
  const { email } = await request.json();

  // Server side form validation
  const { errors } = validateFormData(passwordResetFormSchema, {
    email,
  });

  // If there are validation errors, return a JSON response with the errors and a 401 status.
  if (errors) {
    return NextResponse.json({ errors }, { status: 401 });
  }

  // Password reset stub - not using Supabase
  // In a real implementation, you would handle password reset through your backend
  console.log(`Password reset requested for: ${email}`);

  // Return success response (stub implementation)
  return NextResponse.json({ success: true });
}
