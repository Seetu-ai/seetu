import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user exists in our database
      let user = await prisma.user.findUnique({
        where: { authId: data.user.id },
        include: { brands: true },
      });

      // If not, create the user
      if (!user) {
        user = await prisma.user.create({
          data: {
            authId: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
            avatarUrl: data.user.user_metadata?.avatar_url,
            creditUnits: 300, // Give new users 3 free credits
          },
          include: { brands: true },
        });

        // New user - redirect to onboarding
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      // Check if user has any brands
      if (user.brands.length === 0) {
        // No brands, redirect to onboarding
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      // Redirect to studio
      return NextResponse.redirect(`${origin}/studio`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
