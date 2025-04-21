const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}",
    "../app/views/**/*.html.erb",
    "../app/components/**/*.{html.erb,.rb}",
    "../public/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Fira Code', ...defaultTheme.fontFamily.mono]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
