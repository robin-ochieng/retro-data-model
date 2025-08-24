import React from 'react';
import { Link } from 'react-router-dom';

export type LogoProps = { className?: string };

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center font-bold text-xl tracking-tight text-blue-700 dark:text-blue-400 ${className}`}
      aria-label="Kenbright Re Home"
    >
      Kenbright Re
    </Link>
  );
}
