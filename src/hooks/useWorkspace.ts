'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface Workspace {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  logoUrl: string | null;
  credits: number;
  creditUnits: number;
  plan: string;
  role: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWorkspace() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data, error, isLoading, mutate } = useSWR<{ workspace: Workspace }>(
    slug ? `/api/v1/workspaces/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    workspace: data?.workspace,
    error,
    isLoading,
    mutate,
    slug,
  };
}

export function useCredits() {
  const { workspace, mutate } = useWorkspace();

  const refreshCredits = async () => {
    await mutate();
  };

  return {
    credits: workspace?.credits ?? 0,
    creditUnits: workspace?.creditUnits ?? 0,
    refreshCredits,
  };
}
