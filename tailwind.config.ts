import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── ISA-101 High-Performance HMI Color System ──────────────────
        // Backgrounds: Low-contrast neutral slate to minimize eye strain
        "bg-base":     "hsl(220, 15%, 11%)",   // Darkest - root background
        "bg-surface":  "hsl(220, 13%, 16%)",   // Cards, panels
        "bg-elevated": "hsl(220, 12%, 21%)",   // Modals, dropdowns
        "bg-hover":    "hsl(220, 11%, 26%)",   // Interactive hover state

        // Borders: Structural hierarchy without visual noise
        "border-subtle": "hsl(220, 10%, 26%)",
        "border-strong": "hsl(220, 10%, 36%)",

        // Text: Calibrated for legibility on dark backgrounds
        "text-primary":  "hsl(220, 10%, 88%)",
        "text-secondary":"hsl(220,  8%, 65%)",
        "text-muted":    "hsl(220,  6%, 44%)",
        "text-disabled": "hsl(220,  5%, 32%)",

        // Accent: Deep maroon (ISA-101 structural highlight)
        maroon: {
          DEFAULT: "hsl(345, 65%, 38%)",
          light:   "hsl(345, 60%, 48%)",
          dark:    "hsl(345, 70%, 28%)",
          subtle:  "hsl(345, 40%, 20%)",
        },

        // Accent: Muted slate for secondary highlights
        slate: {
          accent:  "hsl(215, 25%, 45%)",
          light:   "hsl(215, 22%, 58%)",
          subtle:  "hsl(215, 20%, 22%)",
        },

        // Status colors: ONLY used to convey critical information (ISA-101)
        status: {
          overdue:  "hsl(  0, 70%, 55%)",  // Red: missed deadlines
          warning:  "hsl( 38, 80%, 55%)",  // Amber: approaching deadline / flagged
          ok:       "hsl(145, 50%, 42%)",  // Green: on track
          blocked:  "hsl(280, 50%, 50%)",  // Purple: blocked tasks
          info:     "hsl(210, 70%, 55%)",  // Blue: informational
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        "2xs": ["0.65rem",  { lineHeight: "0.9rem"  }],
        xs:    ["0.75rem",  { lineHeight: "1rem"    }],
        sm:    ["0.875rem", { lineHeight: "1.25rem" }],
        base:  ["1rem",     { lineHeight: "1.5rem"  }],
        lg:    ["1.125rem", { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",  { lineHeight: "1.875rem"}],
        "2xl": ["1.5rem",   { lineHeight: "2rem"    }],
      },

      borderRadius: {
        sm:  "4px",
        md:  "6px",
        lg:  "10px",
        xl:  "14px",
        "2xl": "20px",
      },

      spacing: {
        "sidebar-expanded":  "320px",
        "sidebar-collapsed": "52px",
        "nav-expanded":      "220px",
        "nav-collapsed":     "56px",
      },

      boxShadow: {
        "glass":    "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "panel":    "0 2px 12px rgba(0,0,0,0.3)",
        "modal":    "0 20px 60px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.4)",
        "maroon":   "0 0 0 2px hsl(345, 65%, 38%)",
        "inset-sm": "inset 0 1px 3px rgba(0,0,0,0.3)",
      },

      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)"    },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)"     },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1"   },
          "50%":      { opacity: "0.6" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },

      animation: {
        "fade-in":       "fade-in 200ms ease-out",
        "slide-in-right":"slide-in-right 300ms cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slide-in-left 300ms cubic-bezier(0.16,1,0.3,1)",
        "pulse-soft":    "pulse-soft 2s ease-in-out infinite",
        "shimmer":       "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
