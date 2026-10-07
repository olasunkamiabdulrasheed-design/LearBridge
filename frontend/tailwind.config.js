/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          500: "#2f5bff",
          600: "#2547d6",
          700: "#1e3aa8",
        },
      },
    },
  },
  plugins: [],
};
