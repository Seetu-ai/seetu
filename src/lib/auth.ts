import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

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
 * Extract Bearer token from Authorization header
 */
async function getBearerToken(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get auth user from Bearer token (for mobile/API clients)
 */
async function getAuthUserFromToken(token: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * Get the current authenticated user from the database
 * Supports both cookie-based auth (web) and Bearer token auth (mobile/API)
 * Creates the user if they don't exist yet (first login after signup)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Try Bearer token first (for mobile/API clients)
    const bearerToken = await getBearerToken();
    let authUser = null;

    if (bearerToken) {
      authUser = await getAuthUserFromToken(bearerToken);
    }

    // Fall back to cookie-based auth (for web clients)
    if (!authUser) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        authUser = user;
      }
    }

    if (!authUser) {
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
