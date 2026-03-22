import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Billboard Display',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none select-none">
      {children}
    </div>
  );
}
