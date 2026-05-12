import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (value: number | string | null | undefined, decimals: number = 2) => {
  const fallback = (0).toFixed(decimals);
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  
  // Perú usa punto para decimales y coma para miles (Oficial desde 2010)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatCurrency = (value: number | string | null | undefined, currency: string = 'S/') => {
  return `${currency} ${formatNumber(value)}`;
};
