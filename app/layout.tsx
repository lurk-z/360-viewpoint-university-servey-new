import type { Metadata, Viewport } from 'next';
import '../src/styles.css';
import DevelopmentRuntime from '../components/DevelopmentRuntime';

export const metadata: Metadata = {
  title: 'FITM 360° Virtual Tour · KMUTNB Prachinburi',
  description: 'ทัวร์เสมือนจริง 360° คณะเทคโนโลยีและการจัดการอุตสาหกรรม มจพ. วิทยาเขตปราจีนบุรี',
  applicationName: 'FITM 360° Virtual Tour',
  icons: {
    icon: [{ url: '/fitm-favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/fitm-favicon.svg',
    apple: '/mainimages/Logo_FitM/FITM_LOGO.png'
  },
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#082f49',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body><DevelopmentRuntime />{children}</body>
    </html>
  );
}
