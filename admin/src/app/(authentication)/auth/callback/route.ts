import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Auth callback stub - not using Supabase
  const requestUrl = new URL(request.url);
  
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}
