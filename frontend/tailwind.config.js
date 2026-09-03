/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Palet "buku tua bersampul kulit" - dari krim perkamen (50) sampai kulit gelap (900).
      // Dipakai di seluruh app: background gabungan warna sampul kulit, kartu bernuansa
      // perkamen, dan tombol dengan garis luar warna paling muda (leather-50).
      colors: {
        leather: {
          50: '#FBF5E6',
          100: '#F3E6C4',
          200: '#E6CD96',
          300: '#D4AD68',
          400: '#BE8C4C',
          500: '#A06A34',
          600: '#7F4F28',
          700: '#623B20',
          800: '#452919',
          900: '#2B1810',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
