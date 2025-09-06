import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';

export type LogoProps = { className?: string };

export default function Logo({ className = '' }: LogoProps) {
  const { isDark } = useTheme();
  const src = isDark
    ? '/Retrocession_Hub_Dark_Mode_Variant.png'
    : '/Retrocession%20Hub%20Logo.png';
  return (
    <Link
      to="/"
      className={`inline-flex items-center ${className}`}
      aria-label="Retrocession Hub Home"
    >
      <img
        src={src}
        alt="Retrocession Hub"
        className="h-7 w-auto md:h-8"
      />
    </Link>
  );
}
