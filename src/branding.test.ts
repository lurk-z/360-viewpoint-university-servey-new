import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FITM_LOGO_URL = '/mainimages/Logo_FitM/FITM_LOGO.png';

describe('FITM branding', () => {
  it('uses the FITM logo in both visible brand marks', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/TourApp.tsx'), 'utf8');
    expect(source).toContain(`const FITM_LOGO_URL = '${FITM_LOGO_URL}'`);
    expect(source.match(/brand__mark--fitm/g)).toHaveLength(2);
  });

  it('keeps the source logo dimensions and precaches it for offline use', () => {
    const logoPath = resolve(process.cwd(), 'public', FITM_LOGO_URL.slice(1));
    expect(existsSync(logoPath)).toBe(true);
    const logo = readFileSync(logoPath);
    expect(logo.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect({ width: logo.readUInt32BE(16), height: logo.readUInt32BE(20) })
      .toEqual({ width: 200, height: 117 });

    const serviceWorker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
    expect(serviceWorker).toContain(`'${FITM_LOGO_URL}'`);
  });

  it('uses FITM metadata, browser icon, PWA colors and a fresh offline cache', () => {
    const layout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
    ) as {
      name: string;
      short_name: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string }>;
    };
    const favicon = readFileSync(resolve(process.cwd(), 'public/fitm-favicon.svg'), 'utf8');
    const serviceWorker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

    expect(layout).toContain("title: 'FITM 360° Virtual Tour · KMUTNB Prachinburi'");
    expect(layout).toContain("themeColor: '#082f49'");
    expect(layout).toContain("url: '/fitm-favicon.svg'");
    expect(manifest).toMatchObject({
      name: 'FITM 360° Virtual Tour · KMUTNB Prachinburi',
      short_name: 'FITM 360°',
      theme_color: '#082f49',
      background_color: '#f3f9fc'
    });
    expect(manifest.icons[0]?.src).toBe('/fitm-favicon.svg');
    expect(favicon).toContain('aria-label="FITM"');
    expect(favicon).toContain('fill="#20b5e6"');
    expect(serviceWorker).toContain("const CACHE_NAME = 'kmuntb-tour-v10'");
    expect(serviceWorker).toContain("'/fitm-favicon.svg'");
    expect(serviceWorker).toContain("'/api/content'");
  });

  it('uses the FITM blue palette for the application chrome', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const viewer = readFileSync(resolve(process.cwd(), 'components/TourViewer.tsx'), 'utf8');
    const map = readFileSync(resolve(process.cwd(), 'components/TourMap.tsx'), 'utf8');

    expect(styles).toContain('--fitm-navy: #082f49');
    expect(styles).toContain('--fitm-cyan: #0ea5e9');
    expect(styles).toContain('--fitm-surface: #f3f9fc');
    expect(viewer).toContain("canvasBackground: '#082f49'");
    expect(map).toContain("color: '#0ea5e9'");
  });
});
