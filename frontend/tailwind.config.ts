import type { Config } from "tailwindcss";

/* ==========================================================================
   TRANSPORTI — DESIGN SYSTEM « VERRE & LUMIÈRE »
   ==========================================================================

   Principe directeur : une carte translucide (« verre ») posée sur un fond
   bleu Transporti traversé de halos colorés flous (« lumière »).
     - le BLEU porte l'identité et la hiérarchie ;
     - l'ORANGE porte UNE SEULE action par écran ;
     - le VERT porte la valeur (remise, vérification, gain).

   Trois règles non négociables :
     1. Un seul bouton orange par écran. Le reste est bleu, blanc ou contour.
     2. Le verre ne vit que sur le bleu. Sur fond clair (--bg-app) on passe à
        des cartes blanches opaques à ombre douce. Jamais de verre sur blanc.
     3. Pas de dégradé décoratif sur les cartes. Le dégradé est réservé au
        fond d'écran.

   ---------------------------------------------------------------------------
   NOTE DE MIGRATION — pourquoi plusieurs échelles pointent vers les mêmes
   couleurs :

   La base de code utilisait déjà `brand-*`, `primary-*`, `accent-*`, `cta-*`,
   `neutral-*` et `slate-*` (près de 4 000 occurrences). Plutôt que réécrire
   chaque classe — donc risquer de casser du balisage — les anciennes échelles
   sont RÉ-ANCRÉES sur la nouvelle palette. Une classe `text-neutral-500`
   écrite l'an dernier rend désormais exactement le `--ink-500` de la charte.

   Échelle canonique (à utiliser dans tout code neuf) :
     blue-{900,800,700,600}  orange-{500,600}  green-{500,300}
     ink-{900,500,300}       app  surface  line  line-strong
   Alias de compatibilité (code existant, ne plus étendre) :
     brand-*  primary-*  accent-*  cta-*  neutral-*  slate-*  success-*
   ========================================================================== */

/* Rampe neutre unique — sert à la fois `neutral-*`, `slate-*` et `ink-*`.
   Les quatre valeurs de charte y sont placées à leur cran naturel, si bien
   que le code existant retombe pile sur la charte :
     neutral-50  -> --bg-app        (#F6F8FC)
     neutral-200 -> --border        (#E6EBF3)
     neutral-300 -> --border-strong (#D5DBE6)
     neutral-400 -> --ink-300       (#9AA3B2)
     neutral-500 -> --ink-500       (#6B7280)
     neutral-900 -> --ink-900       (#111827) */
const NEUTRAL_RAMP = {
  50: "#F6F8FC",
  100: "#EEF2F8",
  200: "#E6EBF3",
  300: "#D5DBE6",
  400: "#9AA3B2",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
} as const;

/* Rampe bleue — 700 est la couleur primaire de la marque (Royal Blue).
   Les crans 50/100/200 sont les neutres « sur bleu » de la charte, ce qui
   permet d'écrire `text-blue-200` pour du texte secondaire sur dégradé. */
const BLUE_RAMP = {
  50: "#EEF2FF", // --info-bg
  100: "#DBE6FB", // --on-blue-200
  200: "#CBD9F5", // --on-blue-300 (texte secondaire sur bleu)
  300: "#9FBAEE",
  400: "#5A87D9",
  500: "#2F72C4",
  600: "#2563B3", // liens, accents secondaires
  700: "#1E3A8A", // PRIMAIRE — Royal Blue
  800: "#16307A",
  900: "#0E2058", // fin de dégradé
} as const;

/* Rampe verte — porte la VALEUR (remise, vérifié, jauge positive).
   Jamais utilisée pour une action principale. */
const GREEN_RAMP = {
  50: "#ECFDF5",
  100: "#D3F7E1",
  200: "#A9EFC3",
  300: "#8FF0B6", // texte vert sur fond bleu
  400: "#56C578",
  500: "#2FAC55", // VALEUR — vert de charte
  600: "#279247",
  700: "#0F9B6C", // encre des tags verts sur fond #ECFDF5
  800: "#185C2C",
  900: "#0F3E1E",
} as const;

/* Rampe orange — réservée au CTA unique de chaque écran. */
const ORANGE_RAMP = {
  50: "#FFF7ED",
  100: "#FFEDD5",
  200: "#FED7AA",
  300: "#FDBA74",
  400: "#FB923C",
  500: "#F97316", // CTA unique
  600: "#EA6A0C", // hover CTA
  700: "#C2410C",
  800: "#9A3412",
  900: "#7C2D12",
} as const;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ------------------------------------------------------------------ */
      /*  COULEURS                                                          */
      /* ------------------------------------------------------------------ */
      colors: {
        /* --- Échelle canonique --------------------------------------- */
        blue: BLUE_RAMP,
        orange: ORANGE_RAMP,
        green: GREEN_RAMP,

        /* Encres sur fond clair */
        ink: {
          900: "#111827", // titres
          700: "#374151",
          500: "#6B7280", // texte secondaire
          300: "#9AA3B2", // tertiaire, prix barré
        },

        /* Neutres « sur bleu » — texte posé sur le dégradé */
        "on-blue": {
          100: "#FFFFFF",
          200: "#DBE6FB",
          300: "#CBD9F5",
        },

        /* Surfaces */
        app: "#F6F8FC", // fond des écrans applicatifs
        surface: "#FFFFFF", // carte blanche opaque
        line: "#E6EBF3", // filet standard
        "line-strong": "#D5DBE6", // filet appuyé (boutons contour)

        /* --- Alias de compatibilité ---------------------------------- */
        /* `brand-600` et `primary-700` étaient déjà le Royal Blue : les deux
           crans pointent donc sur #1E3A8A pour que rien ne bouge. */
        brand: {
          50: BLUE_RAMP[50],
          100: BLUE_RAMP[100],
          200: BLUE_RAMP[200],
          300: BLUE_RAMP[300],
          400: BLUE_RAMP[400],
          500: BLUE_RAMP[600], // ancien « logo blue » #2563B3
          600: BLUE_RAMP[700], // ancien Royal Blue #1E3A8A
          700: BLUE_RAMP[800],
          800: "#112C66",
          900: BLUE_RAMP[900],
        },
        primary: {
          50: BLUE_RAMP[50],
          100: BLUE_RAMP[100],
          200: BLUE_RAMP[200],
          300: BLUE_RAMP[300],
          400: BLUE_RAMP[400],
          500: BLUE_RAMP[500],
          600: BLUE_RAMP[600],
          700: BLUE_RAMP[700], // ancien « main primary »
          800: BLUE_RAMP[800],
          900: BLUE_RAMP[900],
        },
        accent: GREEN_RAMP, // l'ancien accent vert -> vert de charte
        cta: ORANGE_RAMP, // l'ancien cta orange -> orange de charte
        neutral: NEUTRAL_RAMP,
        slate: NEUTRAL_RAMP, // grise l'admin sur la même rampe

        /* --- Sémantique ---------------------------------------------- */
        success: {
          light: GREEN_RAMP[100],
          DEFAULT: GREEN_RAMP[500],
          dark: GREEN_RAMP[600],
          ...GREEN_RAMP,
        },
        warning: {
          light: "#FEF3C7",
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        error: {
          light: "#FEE2E2",
          DEFAULT: "#EF4444",
          dark: "#DC2626",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        info: {
          light: BLUE_RAMP[50],
          DEFAULT: BLUE_RAMP[600],
          dark: BLUE_RAMP[700],
          bg: BLUE_RAMP[50], // --info-bg
          ink: "#3B5FA4", // --info-ink
        },
      },

      /* ------------------------------------------------------------------ */
      /*  TYPOGRAPHIE — Inter, jamais sous 11px                             */
      /* ------------------------------------------------------------------ */
      fontSize: {
        /* Échelle utilitaire (conservée, resserrée sur la charte) */
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px — plancher
        xs: ["0.75rem", { lineHeight: "1.05rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.2rem" }], // 13px
        base: ["0.9375rem", { lineHeight: "1.5" }], // 15px — corps
        lg: ["1.0625rem", { lineHeight: "1.45" }], // 17px
        xl: ["1.3125rem", { lineHeight: "1.3" }], // 21px
        "2xl": ["1.5rem", { lineHeight: "1.25" }], // 24px
        "3xl": ["1.75rem", { lineHeight: "1.2" }], // 28px
        "4xl": ["2.125rem", { lineHeight: "1.15" }], // 34px
        "5xl": ["2.75rem", { lineHeight: "1.1" }], // 44px
        "6xl": ["3.5rem", { lineHeight: "1.05" }], // 56px
        "7xl": ["4.5rem", { lineHeight: "1.02" }], // 72px

        /* Rôles nommés de la charte — préférés en code neuf */
        "screen-title": [
          "1.75rem",
          { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        "band-title": [
          "1.3125rem",
          { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "800" },
        ],
        hero: [
          "2.125rem",
          { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        price: [
          "1.4375rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" },
        ],
        "card-title": ["1rem", { lineHeight: "1.3", fontWeight: "700" }],
        "field-label": ["0.78125rem", { lineHeight: "1.1", fontWeight: "600" }], // 12.5px
        meta: ["0.71875rem", { lineHeight: "1.15", fontWeight: "600" }], // 11.5px
        "nav-label": ["0.6875rem", { lineHeight: "1", fontWeight: "600" }], // 11px
      },

      letterSpacing: {
        title: "-0.03em",
        heading: "-0.02em",
        cta: "-0.01em",
      },

      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },

      /* ------------------------------------------------------------------ */
      /*  ESPACEMENT                                                        */
      /* ------------------------------------------------------------------ */
      spacing: {
        "0": "0",
        "1": "0.25rem", // 4px
        "2": "0.5rem", // 8px
        "3": "0.75rem", // 12px
        "4": "1rem", // 16px — gap applicatif
        "5": "1.25rem", // 20px — gouttière d'écran
        "5.5": "1.375rem", // 22px — gouttière d'écran (variante)
        "6": "1.5rem", // 24px — gap immersif
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "13": "3.25rem", // 52px — hauteur de champ
        "14": "3.5rem", // 56px — hauteur de CTA
        "16": "4rem",
        "20": "5rem",
        "21.5": "5.375rem", // 86px — hauteur de nav basse
        "24": "6rem",
        "32": "8rem",
      },

      /* ------------------------------------------------------------------ */
      /*  RAYONS — table de la charte                                       */
      /* ------------------------------------------------------------------ */
      borderRadius: {
        none: "0",
        sm: "0.5rem", // 8px  — tag / badge carré
        DEFAULT: "0.625rem", // 10px
        md: "0.8125rem", // 13px — pastille icône
        lg: "0.875rem", // 14px — champ
        xl: "1rem", // 16px — CTA, petite tuile
        "2xl": "1.375rem", // 22px — carte blanche
        "3xl": "1.625rem", // 26px — carte verre
        full: "9999px",

        /* Rôles nommés */
        tag: "8px",
        chip: "13px",
        field: "14px",
        cta: "16px",
        tile: "18px",
        card: "22px",
        glass: "26px",
        sheet: "30px",
        band: "34px",
        device: "42px",
      },

      /* ------------------------------------------------------------------ */
      /*  OMBRES — toutes teintées bleu marine, jamais du noir pur          */
      /* ------------------------------------------------------------------ */
      boxShadow: {
        sm: "0 1px 2px 0 rgba(15,29,78,0.06)",
        DEFAULT: "0 2px 8px 0 rgba(15,29,78,0.06)",
        md: "0 6px 16px -2px rgba(15,29,78,0.07)",
        lg: "0 10px 26px rgba(15,29,78,0.08)", // = ombre de carte
        xl: "0 18px 40px rgba(15,29,78,0.10)",
        "2xl": "0 30px 70px rgba(15,29,78,0.18)",
        inner: "inset 0 2px 4px 0 rgba(15,29,78,0.05)",

        /* Rôles nommés de la charte */
        glass: "0 18px 40px rgba(6,17,54,0.28)",
        card: "0 10px 26px rgba(15,29,78,0.08)",
        "card-hover": "0 14px 34px rgba(15,29,78,0.12)",
        cta: "0 12px 26px rgba(249,115,22,0.40)",
        "cta-active": "0 6px 16px rgba(249,115,22,0.36)",
        blue: "0 12px 26px rgba(30,58,138,0.24)",
        device: "0 30px 70px rgba(15,29,78,0.30)",
        nav: "0 10px 24px rgba(249,115,22,0.42)",
        focus: "0 0 0 4px rgba(30,58,138,0.08)",
      },

      /* ------------------------------------------------------------------ */
      /*  FONDS — le dégradé est réservé au fond d'écran                    */
      /* ------------------------------------------------------------------ */
      backgroundImage: {
        immersive:
          "linear-gradient(155deg,#1E3A8A 0%,#2563B3 50%,#0F2461 100%)",
        "immersive-onboarding":
          "linear-gradient(160deg,#16307A 0%,#1E3A8A 45%,#0E2058 100%)",
        band: "linear-gradient(160deg,#1E3A8A 0%,#2563B3 55%,#16307A 100%)",
        skeleton: "linear-gradient(90deg,#EEF2F8 25%,#F6F8FC 50%,#EEF2F8 75%)",
      },

      /* ------------------------------------------------------------------ */
      /*  MOUVEMENT — 120 ms au press, 150 ms au focus, 180 ms en entrée    */
      /* ------------------------------------------------------------------ */
      transitionDuration: {
        "75": "75ms",
        "100": "100ms",
        "120": "120ms",
        "150": "150ms",
        "180": "180ms",
        "200": "200ms",
        "260": "260ms",
        "300": "300ms",
        "500": "500ms",
        "700": "700ms",
        "1000": "1000ms",
      },
      transitionTimingFunction: {
        sheet: "cubic-bezier(.32,.72,0,1)",
        enter: "cubic-bezier(.16,1,.3,1)",
      },

      blur: {
        halo: "60px", // halos de lumière — valeur unique de la charte
      },

      zIndex: {
        "0": "0",
        "10": "10",
        "20": "20",
        "30": "30",
        "40": "40",
        "50": "50",
        sidebar: "35",
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
      },

      animation: {
        "fade-in-up": "fadeInUp 0.18s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fadeIn 0.18s ease-out both",
        "slide-in-r": "slideInRight 0.26s cubic-bezier(.32,.72,0,1) both",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "count-up": "countUp 0.18s cubic-bezier(.16,1,.3,1) both",
        "progress-fill": "progressFill 0.8s ease-out both",
        "scale-in": "scaleIn 0.18s cubic-bezier(.16,1,.3,1) both",
        "sheet-up": "sheetUp 0.26s cubic-bezier(.32,.72,0,1) both",
      },
      keyframes: {
        /* Apparition de liste : fade + translateY(8px), 180 ms (charte §5) */
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-12px) rotate(-1deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        progressFill: {
          "0%": { width: "0%" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        /* Feuille remontante — 260 ms cubic-bezier(.32,.72,0,1) */
        sheetUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
