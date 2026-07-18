import type { Metadata, Viewport } from 'next';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'Virtual Open House KMUTNB · Prachinburi',
  description: 'Virtual Open House 360° ของมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี',
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#9a3412',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
