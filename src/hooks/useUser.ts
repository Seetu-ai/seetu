'use client';

import useSWR from 'swr';
import type { BrandIdentity } from '@/types';

interface Brand {
  id: string;
  name: string;
  instagramHandle: string | null;
  isDefault: boolean;
  visualDNA: BrandIdentity | null;
  verbalDNA: any | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  credits: number;
  creditUnits: number;
  plan: string;
  businessType: string | null;
  brands: Brand[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<{ user: User }>(
    '/api/v1/user',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const defaultBrand = data?.user?.brands?.find(b => b.isDefault) || data?.user?.brands?.[0];

  return {
    user: data?.user,
    brand: defaultBrand,
    brands: data?.user?.brands || [],
    error,
    isLoading,
    mutate,
  };
}

export function useCredits() {
  const { user, mutate } = useUser();

  const refreshCredits = async () => {
    await mutate();
  };

  return {
    credits: user?.credits ?? 0,
    creditUnits: user?.creditUnits ?? 0,
    refreshCredits,
  };
}

export function useBrandIdentity() {
  const { brand, isLoading } = useUser();

  return {
    brandIdentity: brand?.visualDNA,
    hasBrandIdentity: !!brand?.visualDNA,
    isLoading,
    primaryColor: brand?.visualDNA?.palette?.primary,
    secondaryColor: brand?.visualDNA?.palette?.secondary,
  };
}
