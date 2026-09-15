/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Connecto brand system — orange = action, cream = environment, white = surface.
        brand: {
          50: "#FFF7F0",
          100: "#FFEDE0",
          200: "#FFD9BD",
          300: "#FFC08C",
          DEFAULT: "#FF7A1A",
          500: "#FF7A1A",
          600: "#E9680D",
          logo: "#FF8624",
        },
        ink: "#242424",
        muted: "#6F6F6F",
        cream: "#F7F3EC",
        line: "#E5DED3",
        online: "#39B982",
        danger: "#D9534F",
        chatbg: "#F5EEE3",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        hand: ["Caveat", "ui-rounded", "Segoe UI", "cursive"],
      },
      boxShadow: {
        card: "0 18px 45px -28px rgba(36, 36, 36, 0.35)",
        soft: "0 30px 70px -40px rgba(36, 36, 36, 0.45)",
        // Named "glow" rather than "brand": a `shadow-<color>` utility would
        // otherwise collide with this key and cancel the shadow out.
        glow: "0 12px 26px -14px rgba(255, 122, 26, 0.9)",
      },
      borderRadius: {
        input: "10px",
        card: "18px",
      },
    },
  },
  plugins: [],
}