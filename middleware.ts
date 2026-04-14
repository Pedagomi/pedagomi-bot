import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques, images et API internes Next
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|manifest.json|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
