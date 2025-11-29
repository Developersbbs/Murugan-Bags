import { NextResponse } from "next/server";

import { passwordUpdateFormSchema } from "@/app/(authentication)/update-password/_components/schema";
import validateFormData from "@/helpers/validateFormData";

export async function POST(request: Request) {
  // Get form fields
  const { password, confirmPassword, code } = await request.json();

  // Server side form validation
  const { errors } = validateFormData(passwordUpdateFormSchema, {
    password,
    confirmPassword,
  });

  // If there are validation errors, return a JSON response with the errors and a 401 status.
  if (errors) {
    return NextResponse.json({ errors }, { status: 401 });
  }

  // Password update stub - not using Supabase
  // In a real implementation, you would verify the code and update password in your backend
  console.log(`Password update attempt with code: ${code}`);

  // For now, just return success (stub implementation)
  // You should implement proper password update logic here
  return NextResponse.json({ success: true });
}
