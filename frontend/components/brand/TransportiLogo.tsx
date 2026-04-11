"use client";

import React from "react";

/* -------------------------------------------------------------------------- */
/*  TRANSPORTI LOGO — Official Brand Component                                */
/*  Logo icon replaces the "T" in the wordmark "Transporti"                   */
/*  Blue bar (#2563B3) + Green swoosh arrow (#2FAC55)                         */
/* -------------------------------------------------------------------------- */

type LogoVariant = "color" | "white" | "dark";

type LogoContext =
  | "header" // White/light bg navbar
  | "sidebar" // White sidebar, compact
  | "sidebar-dark" // Dark (royal blue) sidebar — Admin
  | "footer" // Dark footer
  | "auth" // Dark gradient, frosted glass
  | "hero" // Over hero gradient
  | "mobile" // Compact mobile
  | "custom";

interface TransportiLogoProps {
  context?: LogoContext;
  variant?: LogoVariant;
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
}

/* -------------------------------------------------------------------------- */
/*  SVG Paths — Official logo from logo transporti.png                        */
/* -------------------------------------------------------------------------- */

const BLUE_PATH = "M108 120 L310 120 L280 210 L78 210 Z";
const GREEN_PATH =
  "M130 460 C100 350, 82 280, 100 230 C118 185, 160 168, 230 168 L230 95 L420 195 L230 295 L230 225 C180 225, 155 240, 145 268 C132 300, 135 360, 155 460 Z";

/* -------------------------------------------------------------------------- */
/*  Color Maps                                                                */
/* -------------------------------------------------------------------------- */

const COLORS: Record<
  LogoVariant,
  { bar: string; barOpacity: number; arrow: string }
> = {
  color: { bar: "#2563B3", barOpacity: 1, arrow: "#2FAC55" },
  white: { bar: "#ffffff", barOpacity: 0.9, arrow: "#ffffff" },
  dark: { bar: "#1f2937", barOpacity: 0.85, arrow: "#111827" },
};

/* -------------------------------------------------------------------------- */
/*  Context-to-config mapping                                                 */
/* -------------------------------------------------------------------------- */

interface ContextConfig {
  variant: LogoVariant;
  containerClass: string;
  svgClass: string;
  wordmarkColor: string;
  subtitleColor: string;
}

const CONTEXT_CONFIGS: Record<Exclude<LogoContext, "custom">, ContextConfig> = {
  header: {
    variant: "color",
    containerClass: "",
    svgClass: "drop-shadow-sm",
    wordmarkColor: "text-neutral-900",
    subtitleColor: "text-neutral-500",
  },
  sidebar: {
    variant: "color",
    containerClass: "",
    svgClass: "drop-shadow-sm",
    wordmarkColor: "text-neutral-900",
    subtitleColor: "text-neutral-500",
  },
  "sidebar-dark": {
    variant: "color",
    containerClass: "bg-white/95 rounded-lg p-1 shadow-sm",
    svgClass: "",
    wordmarkColor: "text-white",
    subtitleColor: "text-blue-200",
  },
  footer: {
    variant: "color",
    containerClass: "bg-white rounded-lg p-1.5 shadow-sm shadow-white/10",
    svgClass: "",
    wordmarkColor: "text-white",
    subtitleColor: "text-neutral-400",
  },
  auth: {
    variant: "color",
    containerClass:
      "bg-white/95 backdrop-blur-md rounded-xl shadow-lg shadow-black/10 border border-white/30 p-2",
    svgClass: "",
    wordmarkColor: "text-white",
    subtitleColor: "text-blue-200",
  },
  hero: {
    variant: "white",
    containerClass: "",
    svgClass: "drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]",
    wordmarkColor: "text-white",
    subtitleColor: "text-white/70",
  },
  mobile: {
    variant: "color",
    containerClass: "",
    svgClass: "",
    wordmarkColor: "text-neutral-900",
    subtitleColor: "text-neutral-500",
  },
};

/* -------------------------------------------------------------------------- */
/*  Wordmark: Logo icon replaces "T", rendered as "[icon]ransporti"           */
/* -------------------------------------------------------------------------- */

function LogoWordmark({
  size,
  colors,
  svgClass,
  wordmarkColor,
  subtitleColor,
  subtitle,
}: {
  size: number;
  colors: { bar: string; barOpacity: number; arrow: string };
  svgClass: string;
  wordmarkColor: string;
  subtitleColor: string;
  subtitle?: string;
}) {
  // The icon acts as the "T" — scale it to match text height
  const iconSize = Math.round(size * 0.85);

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <svg
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          width={iconSize}
          height={iconSize}
          className={`${svgClass} object-contain flex-shrink-0 -mr-0.5`}
          aria-hidden="true"
        >
          <path d={BLUE_PATH} fill={colors.bar} opacity={colors.barOpacity} />
          <path d={GREEN_PATH} fill={colors.arrow} />
        </svg>
        <span className={`font-bold leading-tight ${wordmarkColor}`}>
          ransporti
        </span>
      </div>
      {subtitle && (
        <span className={`text-[10px] font-medium ${subtitleColor} ml-0.5`}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function TransportiLogo({
  context = "custom",
  variant = "color",
  size = 32,
  className = "",
  showWordmark = false,
  subtitle,
}: TransportiLogoProps) {
  const config: ContextConfig =
    context !== "custom"
      ? CONTEXT_CONFIGS[context]
      : {
          variant,
          containerClass: "",
          svgClass: "",
          wordmarkColor:
            variant === "white" ? "text-white" : "text-neutral-900",
          subtitleColor:
            variant === "white" ? "text-white/70" : "text-neutral-500",
        };

  const colors = COLORS[config.variant];
  const containerSize = config.containerClass ? size + 12 : size;

  const svgElement = (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={`${config.svgClass} object-contain`}
      aria-hidden="true"
    >
      <path d={BLUE_PATH} fill={colors.bar} opacity={colors.barOpacity} />
      <path d={GREEN_PATH} fill={colors.arrow} />
    </svg>
  );

  const logoElement = config.containerClass ? (
    <div
      className={`flex items-center justify-center ${config.containerClass}`}
      style={{ width: containerSize, height: containerSize }}
    >
      {svgElement}
    </div>
  ) : (
    svgElement
  );

  // Wordmark mode: logo icon replaces the "T" in "Transporti"
  if (showWordmark) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {config.containerClass ? logoElement : null}
        {config.containerClass ? (
          <div className="flex flex-col">
            <span className={`font-bold leading-tight ${config.wordmarkColor}`}>
              Transporti
            </span>
            {subtitle && (
              <span
                className={`text-[10px] font-medium ${config.subtitleColor}`}
              >
                {subtitle}
              </span>
            )}
          </div>
        ) : (
          <LogoWordmark
            size={size}
            colors={colors}
            svgClass={config.svgClass}
            wordmarkColor={config.wordmarkColor}
            subtitleColor={config.subtitleColor}
            subtitle={subtitle}
          />
        )}
      </div>
    );
  }

  return <div className={className}>{logoElement}</div>;
}

/* -------------------------------------------------------------------------- */
/*  Named exports for convenience                                              */
/* -------------------------------------------------------------------------- */

/** Header logo: [logo]ransporti + subtitle */
export function HeaderLogo() {
  return (
    <TransportiLogo
      context="header"
      size={34}
      showWordmark
      subtitle="Logistique simplifiée"
    />
  );
}

/** Sidebar logo (white bg): [logo]ransporti + PARTNER */
export function SidebarLogo() {
  return (
    <TransportiLogo
      context="sidebar"
      size={28}
      showWordmark
      subtitle="Logistique simplifiée"
    />
  );
}

/** Admin sidebar logo (dark bg): logo on white pill + Transporti text */
export function AdminSidebarLogo() {
  return (
    <TransportiLogo
      context="sidebar-dark"
      size={26}
      showWordmark
      subtitle="Admin Panel"
    />
  );
}

/** Footer logo: colored on white pill + wordmark */
export function FooterLogo() {
  return <TransportiLogo context="footer" size={22} showWordmark />;
}

/** Auth layout logo: on frosted glass + wordmark */
export function AuthLogo() {
  return (
    <TransportiLogo
      context="auth"
      size={38}
      showWordmark
      subtitle="La logistique réinventée"
    />
  );
}

/** Hero logo: white glow for over gradients */
export function HeroLogo() {
  return <TransportiLogo context="hero" size={40} showWordmark />;
}
