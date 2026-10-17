// app/api/auth/session/route.ts
// Handles session inspection and logout

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("curasync_session")?.value;
  const uidCookie = cookieStore.get("curasync_uid")?.value;

  if (!sessionToken && !uidCookie) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let uid = uidCookie;
  if (sessionToken) {
    const decoded = await verifyFirebaseIdToken(sessionToken);
    if (decoded?.uid) {
      uid = decoded.uid;
    }
  }

  if (!uid) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    user: profile || { id: uid },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("curasync_session");
  response.cookies.delete("curasync_uid");
  return response;
}
