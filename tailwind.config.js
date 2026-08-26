/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "oklch(0.145 0.008 250)",
        ink: "oklch(0.93 0.012 100)",
        muted: "oklch(0.68 0.015 250)",
        line: "oklch(0.28 0.012 250)",
        brand: "oklch(0.78 0.04 195)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
};
