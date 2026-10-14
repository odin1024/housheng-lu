'use client';

import Link from 'next/link';

interface EmergencyCardProps {
  title: string;
  description: string;
  href: string;
}

export function EmergencyCard({ title, description, href }: EmergencyCardProps) {
  return (
    <Link
      href={href}
      className="block py-4 px-5 border border-vermillion text-center bg-transparent hover:bg-vermillion hover:text-bg transition-all duration-200"
      style={{
        borderBottom: '1px solid var(--color-vermillion)',
        color: 'var(--color-vermillion)',
        textDecoration: 'none',
      }}
    >
      <div className="text-2xl font-bold tracking-guo" style={{ fontFamily: 'var(--font-zh-heading)' }}>
        {title}
      </div>
      {description && (
        <div className="text-xs mt-1 opacity-80">
          {description}
        </div>
      )}
    </Link>
  );
}
