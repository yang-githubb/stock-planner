/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#0b0d13",
        },
      },
    },
  },
  plugins: [],
};
