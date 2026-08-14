'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface AdminNavigationProps {
  readonly links: readonly (readonly [label: string, href: string])[];
}

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span className={`admin-nav__pending${pending ? ' is-pending' : ''}`} aria-hidden="true">
      {pending ? 'กำลังโหลด…' : ''}
    </span>
  );
}

export default function AdminNavigation({ links }: AdminNavigationProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const activeLink = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    activeLink?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <nav ref={navRef} className="admin-nav" aria-label="เมนูผู้ดูแล">
      {links.map(([label, href]) => {
        const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link href={href} aria-current={active ? 'page' : undefined} key={href}>
            <span>{label}</span>
            <PendingIndicator />
          </Link>
        );
      })}
    </nav>
  );
}
