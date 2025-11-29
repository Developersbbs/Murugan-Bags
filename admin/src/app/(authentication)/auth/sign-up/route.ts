import { NextResponse } from "next/server";

import { signupFormSchema } from "@/app/(authentication)/signup/_components/schema";
import validateFormData from "@/helpers/validateFormData";

export async function POST(request: Request) {
  // Get form fields
  const { name, email, password, confirmPassword, privacy } =
    await request.json();

  // Server side form validation
  const { errors } = validateFormData(signupFormSchema, {
    name,
    email,
    password,
    confirmPassword,
    privacy,
  });

  // If there are validation errors, return a JSON response with the errors and a 401 status.
  if (errors) {
    return NextResponse.json({ errors }, { status: 401 });
  }

  // Sign up stub - not using Supabase
  // In a real implementation, you would create user account in your backend
  console.log(`Sign up attempt for: ${email} (${name})`);

  // For now, just return success (stub implementation)
  // You should implement proper user creation logic here
  return NextResponse.json({ success: true });
}
