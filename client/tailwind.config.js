/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 24px 56px -28px rgb(15 23 42 / 0.35)",
      },
    },
  },
  plugins: [],
}

