import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { DisplayConfig } from '@/lib/display/types';
import { generateDisplayToken } from '@/lib/display/display-token';
import { DisplayPlayer } from './_components/display-player';

interface DisplayPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; debug?: string }>;
}

export default async function DisplayPage({
  params,
  searchParams,
}: DisplayPageProps) {
  const { slug } = await params;
  const { key, debug } = await searchParams;

  if (!key) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white text-lg">
        Missing API key. Use ?key=your_api_key
      </div>
    );
  }

  const billboard = await prisma.billboard.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      apiKey: true,
      defaultContentUrl: true,
      slotDurationSecs: true,
      isActive: true,
    },
  });

  if (!billboard || !billboard.isActive) {
    notFound();
  }

  if (billboard.apiKey !== key) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white text-lg">
        Invalid API key
      </div>
    );
  }

  const displayToken = generateDisplayToken(billboard.id);

  const config: DisplayConfig = {
    billboardId: billboard.id,
    billboardName: billboard.name,
    slug: billboard.slug,
    apiKey: '',
    displayToken,
    defaultContentUrl: billboard.defaultContentUrl,
    slotDurationSecs: billboard.slotDurationSecs,
  };

  return <DisplayPlayer config={config} debug={debug === '1'} />;
}
