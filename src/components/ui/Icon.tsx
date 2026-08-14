import React from 'react';
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'size'> {
  icon: IconSvgElement;
  size?: IconSize;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
};

export const Icon: React.FC<IconProps> = ({
  icon,
  size = 'md',
  strokeWidth = 1.5,
  className = '',
  color = 'currentColor',
  ...props
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] ?? 18;

  return (
    <HugeiconsIcon
      icon={icon}
      size={pixelSize}
      strokeWidth={strokeWidth}
      color={color}
      className={`shrink-0 ${className}`}
      {...props}
    />
  );
};
