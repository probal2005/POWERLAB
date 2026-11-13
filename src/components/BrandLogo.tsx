type BrandLogoProps = {
  variant?: 'header' | 'footer' | 'sidebar' | 'auth';
  className?: string;
};

const variantStyles = {
  header: 'h-12 w-24 sm:h-14 sm:w-28',
  footer: 'h-16 w-32 sm:h-18 sm:w-36',
  sidebar: 'h-16 w-32',
  auth: 'mx-auto h-24 w-48 sm:h-28 sm:w-56',
};

export default function BrandLogo({
  variant = 'header',
  className = '',
}: BrandLogoProps) {
  return (
    <picture className="block shrink-0">
      <source srcSet="/powerlab-logo.webp" type="image/webp" />
      <img
        src="/powerlab-logo.png"
        alt="POWERLAB — Knowledge, Commands, Influence"
        className={`block shrink-0 object-contain ${variantStyles[variant]} ${className}`}
        width="448"
        height="224"
        draggable={false}
      />
    </picture>
  );
}
