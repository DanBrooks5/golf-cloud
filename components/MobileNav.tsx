'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Upload, Share2, LogIn } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const item = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        style={{
          flex: 1,
          textDecoration: 'none',
          color: active ? '#111' : '#666',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          paddingTop: 8,
        }}
      >
        {icon}
        <span style={{ fontSize: 12 }}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '64px',
        display: 'none',               // hidden on desktop
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTop: '1px solid #e5e7eb',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {item('/', <Home size={20} />, 'Home')}
      {item('/uploads', <Upload size={20} />, 'Upload')}
      {item('/share', <Share2 size={20} />, 'Coach')}
      {item('/signin', <LogIn size={20} />, 'Sign in')}
    </nav>
  );
}
