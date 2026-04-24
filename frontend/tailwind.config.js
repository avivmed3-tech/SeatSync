/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          DEFAULT: "#D4A808",
          dark: "#C9A006",
          vivid: "#F5C518",
          light: "rgba(212, 168, 8, 0.12)",
        },
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #F5C518 0%, #B38D06 100%)',
        'gradient-dark': 'linear-gradient(135deg, #080808 0%, #141414 100%)',
      }
    },
  },
  plugins: [],
}
