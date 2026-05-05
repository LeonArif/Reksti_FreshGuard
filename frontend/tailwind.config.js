/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 60px -35px rgba(21, 17, 10, 0.5)",
        glow: "0 10px 30px -12px rgba(197, 77, 32, 0.6)"
      }
    }
  },
  plugins: []
};
