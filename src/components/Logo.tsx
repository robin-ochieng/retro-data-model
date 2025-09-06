import React from 'react';
import { Link } from 'react-router-dom';

export type LogoProps = { className?: string };

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center ${className}`}
      aria-label="Retrocession Hub Home"
    >
      <img
        src="/Retrocession%20Hub%20Logo.png"
        alt="Retrocession Hub"
        className="h-10 md:h-12 w-auto"
      />
    </Link>
  );
}
