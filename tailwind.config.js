/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ─── gray → كحلي داكن بدرجات متعددة ────────────────────
        gray: {
          50:  'rgb(var(--text-primary-rgb))',       // #070033 عناوين
          100: 'rgb(var(--text-primary-rgb))',
          200: 'rgb(var(--text-primary-rgb))',
          300: 'rgb(var(--text-secondary-rgb))',     // #4A4870
          350: 'rgb(var(--text-secondary-rgb))',
          400: 'rgb(var(--text-tertiary-rgb))',      // #7E7C9E
          500: 'rgb(var(--text-muted-rgb))',         // #A09EBE
          600: 'rgb(var(--text-muted-rgb))',
          700: 'rgb(var(--border-hover-rgb))',       // #C8CBE0
          800: 'rgb(var(--border-color-rgb))',       // #E4E6EF
          850: 'rgb(var(--bg-tertiary-rgb))',        // #EFF0F7
          900: 'rgb(var(--bg-secondary-rgb))',       // #FFFFFF
          950: 'rgb(var(--bg-primary-rgb))',         // #F7F8FC
          955: 'rgb(var(--bg-secondary-rgb))',
        },
        // ─── slate → نفس التعيين ──────────────────────────────
        slate: {
          50:  'rgb(var(--text-primary-rgb))',
          100: 'rgb(var(--text-primary-rgb))',
          200: 'rgb(var(--text-primary-rgb))',
          300: 'rgb(var(--text-secondary-rgb))',
          350: 'rgb(var(--text-secondary-rgb))',
          400: 'rgb(var(--text-tertiary-rgb))',
          500: 'rgb(var(--text-muted-rgb))',
          550: 'rgb(var(--text-muted-rgb))',
          600: 'rgb(var(--text-muted-rgb))',
          700: 'rgb(var(--border-hover-rgb))',
          800: 'rgb(var(--border-color-rgb))',
          850: 'rgb(var(--bg-tertiary-rgb))',
          900: 'rgb(var(--bg-secondary-rgb))',
          950: 'rgb(var(--bg-primary-rgb))',
          955: 'rgb(var(--bg-secondary-rgb))',
        },
        // ─── اللون الأساسي برتقالي نار ────────────────────────
        indigo: {
          300: '#E5531A',
          400: '#FF6632',
          500: '#FF7744',
          600: '#FF6632',
          700: '#E5531A',
          950: '#FFF0EB',
        },
        // ─── أزرق → يُستخدم أحياناً كـ secondary ──────────────
        blue: {
          400: '#4338CA',
          500: '#4F46E5',
          600: '#4338CA',
          950: '#EEF2FF',
        },
        // ─── أخضر للنجاح ──────────────────────────────────────
        emerald: {
          400: '#059669',
          500: '#10B981',
          600: '#10B981',
          650: '#0D9E74',
          950: '#D1FAE5',
        },
        green: {
          400: '#059669',
          500: '#10B981',
          600: '#10B981',
          950: '#D1FAE5',
        },
        // ─── ذهبي / برتقالي فاتح ──────────────────────────────
        amber: {
          400: '#D97706',
          500: '#FBAC41',
          600: '#FBAC41',
          650: '#F59E0B',
          655: '#E9940A',
          950: '#FFF8E8',
        },
        orange: {
          400: '#EA580C',
          500: '#FF6632',
          600: '#FF6632',
          700: '#E5531A',
          950: '#FFF0EB',
        },
        // ─── أحمر للأخطاء ─────────────────────────────────────
        red: {
          400: '#DC2626',
          500: '#EF4444',
          550: '#E53535',
          600: '#EF4444',
          650: '#DC2626',
          655: '#C82020',
          950: '#FEE2E2',
        },
        // ─── بنفسجي ───────────────────────────────────────────
        purple: {
          400: '#7C3AED',
          500: '#8B5CF6',
          600: '#8B5CF6',
          950: '#EDE9FE',
        },
        // ─── سماوي ────────────────────────────────────────────
        cyan: {
          400: '#0369A1',
          500: '#0EA5E9',
          600: '#0369A1',
          950: '#E0F2FE',
        },
      },
      boxShadow: {
        'primary': '0 4px 20px rgba(255, 102, 50, 0.30)',
        'accent':  '0 4px 16px rgba(251, 172, 65, 0.28)',
        'card':    '0 4px 16px rgba(7, 0, 51, 0.08)',
        'lg':      '0 8px 32px rgba(7, 0, 51, 0.12)',
      },
    },
  },
  plugins: [],
}
