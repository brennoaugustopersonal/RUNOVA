/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        runova: {
          bg: "#070709",
          card: "rgba(20, 20, 28, 0.65)",
          cardHover: "rgba(28, 28, 40, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
          orange: "#ff6d2e",
          yellow: "#ffb800",
          orangeLight: "#ff844c",
          darkSurface: "#0f0f14",
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: "0 0 25px rgba(255, 109, 46, 0.25)",
        yellowGlow: "0 0 25px rgba(255, 184, 0, 0.25)",
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ff6d2e 0%, #ffb800 100%)',
        'brand-gradient-radial': 'radial-gradient(circle at top right, rgba(255, 109, 46, 0.15), transparent 60%)',
      }
    },
  },
  plugins: [],
}
