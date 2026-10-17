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
      className="block py-4 px-5 border border-vermillion text-vermillion text-center bg-transparent hover:bg-vermillion hover:text-bg hover:border-vermillion transition-all duration-200 no-underline"
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
