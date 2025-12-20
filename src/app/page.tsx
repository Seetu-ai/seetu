import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { LandingPage } from '@/components/landing/landing-page';

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    // Get user from our database, or create if doesn't exist
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: { brands: true },
    });

    // Create user if doesn't exist (fallback for direct Supabase signups)
    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          avatarUrl: authUser.user_metadata?.avatar_url,
          creditUnits: 300, // Give new users 3 free credits
        },
        include: { brands: true },
      });
    }

    // If user has brands, go to dashboard
    if (user.brands.length > 0) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  }

  // Landing page for non-authenticated users
  return <LandingPage />;
}
