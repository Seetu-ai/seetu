import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  creditUnits: number;
  plan: string;
  businessType: string | null;
}

/**
 * Get the current authenticated user from the database
 * Creates the user if they don't exist yet (first login after signup)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    // Find or create user in our database
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!user) {
      // Create user on first login
      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          avatarUrl: authUser.user_metadata?.avatar_url,
          creditUnits: 300, // 3 free credits
        },
      });

      // Create initial credit ledger entry
      await prisma.creditLedger.create({
        data: {
          userId: user.id,
          delta: 300,
          balanceAfter: 300,
          reason: 'free_trial',
          description: 'Crédits de bienvenue',
        },
      });
    }

    return {
      id: user.id,
      authId: user.authId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      creditUnits: user.creditUnits,
      plan: user.plan,
      businessType: user.businessType,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user's default brand (or first brand if no default)
 */
export async function getDefaultBrand(userId: string) {
  const brand = await prisma.brand.findFirst({
    where: { userId },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
  });
  return brand;
}
