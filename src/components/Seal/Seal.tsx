'use client';

import { useState } from 'react';

interface SealProps {
  text: string;
  size?: number;
  state?: 'default' | 'active' | 'done';
  onClick?: () => void;
  href?: string;
  title?: string;
  className?: string;
}

export function Seal({ text, size = 32, state = 'default', onClick, href, title, className = '' }: SealProps) {
  const [hover, setHover] = useState(false);

  const stateClass = {
    default: 'border-seal text-seal bg-transparent',
    active: 'bg-seal text-bg border-seal seal-active',
    done: 'bg-seal text-bg border-seal opacity-90',
  }[state];

  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size <= 24 ? 10 : size <= 32 ? 11 : 13}px`,
    borderWidth: `${size <= 24 ? 1 : 1.5}px`,
  };

  const content = (
    <span
      className={`seal ${stateClass} ${className}`}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
    >
      {text}
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        className="inline-block no-underline"
        style={{ borderBottom: 'none' }}
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="inline-block bg-transparent border-none p-0"
        style={{ cursor: 'pointer' }}
      >
        {content}
      </button>
    );
  }

  return content;
}
