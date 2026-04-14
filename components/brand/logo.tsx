import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  monochrome?: boolean;
}

/**
 * Logo Pedagomi Bot — médaille bleu/rouge avec étoile.
 * SVG vectoriel, s'adapte à toutes tailles.
 */
export function Logo({ className, size = 40, withText = false, monochrome = false }: LogoProps) {
  const blue = monochrome ? "currentColor" : "#2563eb";
  const red = monochrome ? "currentColor" : "#dc2626";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size * 1.55}
        viewBox="0 0 100 155"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pedagomi Bot"
      >
        {/* Médaille — anneau bleu */}
        <circle cx="50" cy="45" r="42" stroke={blue} strokeWidth="14" />
        {/* Étoile rouge au centre */}
        <path
          d="M50 22 L56.18 39.27 L74.27 39.27 L59.55 49.82 L65.73 67.09 L50 56.54 L34.27 67.09 L40.45 49.82 L25.73 39.27 L43.82 39.27 Z"
          fill={red}
          stroke={red}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Rubans du bas */}
        {/* Ruban rouge gauche */}
        <path d="M25 90 L25 150 L38 140 L38 95 Z" fill={red} />
        {/* Ruban bleu central */}
        <path d="M38 92 L38 150 L50 142 L62 150 L62 92 Z" fill={blue} />
        {/* Ruban rouge droite */}
        <path d="M62 95 L62 140 L75 150 L75 90 Z" fill={red} />
      </svg>

      {withText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-base">Pedagomi Bot</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Réservation auto
          </span>
        </div>
      )}
    </div>
  );
}
