import type { LucideProps } from "lucide-react";

/**
 * Iconos SVG propios de Finance Pal construidos sobre grid 24x24
 * con stroke="currentColor" para adaptarse automáticamente a temas,
 * colores alternativos, alto contraste y modos de daltonismo.
 */

export function BillIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
    </svg>
  );
}

export function CoinStackIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <ellipse cx="10" cy="7" rx="6" ry="2.5" />
      <path d="M4 7v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V7" />
      <path d="M4 11v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-4" />
      <path d="M4 15v2c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-2" />
      <path d="M18.5 10.5c1.45.45 2.5 1.25 2.5 2.2v4c0 1.1-1.35 2.02-3.25 2.35" />
    </svg>
  );
}

export function ClabeBankIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 10h18" />
      <path d="M5 10v7" />
      <path d="M12 10v7" />
      <path d="M19 10v7" />
      <path d="M2 20h20" />
      <path d="M12 3 2 8v2h20V8Z" />
    </svg>
  );
}

export function ReceiptStampIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 3v18l2.5-1.5L9 21l3-1.5L15 21l2.5-1.5L20 21V3Z" />
      <path d="M8 8h8" />
      <path d="M9.5 13.5 11.5 15.5 15 11.5" />
    </svg>
  );
}
