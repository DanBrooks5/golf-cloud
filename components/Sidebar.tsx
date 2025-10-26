'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Share2, Upload, Video } from 'lucide-react';

type NavLink = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export default function Sidebar() {
  const pathname = usePathname();

  const links: NavLink[] = [
    { href: '/signin',  icon: <LogIn size={20} />,  label: 'Sign In' },
    { href: '/uploads', icon: <Upload size={20} />, label: 'Upload' },
    { href: '/videos',  icon: <Video size={20} />,  label: 'Videos' },
    { href: '/coach', icon: <Share2 size={20} />, label: 'Coach' },
    { href: '/signout', icon: <LogOut size={20} />, label: 'Sign Out' },
  ];

  return (
    <aside
      style={{
        width: 80,
        background: '#fff',
        borderRight: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem 0',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} aria-label={link.label} title={link.label}>
            <span
              style={{
                width: 60,
                height: 60,
                marginBottom: 16,
                borderRadius: 12,
                border: active ? '2px solid #111' : '2px solid transparent',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                color: active ? '#111' : '#777',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
              }}
            >
              {link.icon}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
