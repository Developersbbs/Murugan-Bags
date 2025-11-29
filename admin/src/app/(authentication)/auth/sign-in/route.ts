import { NextResponse } from "next/server";

import { loginFormSchema } from "@/app/(authentication)/login/_components/schema";
import validateFormData from "@/helpers/validateFormData";

export async function POST(request: Request) {
  // Get form fields
  const { email, password } = await request.json();

  // Server side form validation
  const { errors } = validateFormData(loginFormSchema, {
    email,
    password,
  });

  // If there are validation errors, return a JSON response with the errors and a 401 status.
  if (errors) {
    return NextResponse.json({ errors }, { status: 401 });
  }

  // Sign in stub - not using Supabase
  // In a real implementation, you would authenticate against your backend
  console.log(`Sign in attempt for: ${email}`);

  // For now, just return success (stub implementation)
  // You should implement proper authentication logic here
  return NextResponse.json({ success: true });
}
