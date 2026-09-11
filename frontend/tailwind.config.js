/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                sentinel: {
                    bg: '#041c30',
                    card: '#082f49',
                    border: '#0c4a6e',
                    accent: '#0ea5e9',
                    emerald: '#10b981',
                    amber: '#f59e0b',
                    orange: '#f97316',
                    rose: '#f43f5e',
                }
            },
            boxShadow: {
                'sm': '2px 2px 5px rgba(0,0,0,0.4), -1px -1px 3px rgba(255,255,255,0.1)',
                'md': '4px 4px 10px rgba(0, 0, 0, 0.4), -2px -2px 6px rgba(255, 255, 255, 0.1), inset 1px 1px 2px rgba(255,255,255,0.05)',
                'DEFAULT': '4px 4px 10px rgba(0, 0, 0, 0.4), -2px -2px 6px rgba(255, 255, 255, 0.1), inset 1px 1px 2px rgba(255,255,255,0.1)',
                'lg': '6px 6px 15px rgba(0, 0, 0, 0.5), -3px -3px 9px rgba(255, 255, 255, 0.1), inset 1px 1px 2px rgba(255,255,255,0.05)',
                'xl': '8px 8px 20px rgba(0, 0, 0, 0.6), -4px -4px 12px rgba(255, 255, 255, 0.1)',
                '2xl': '12px 12px 30px rgba(0, 0, 0, 0.7), -6px -6px 15px rgba(255, 255, 255, 0.1)',
                'inner': 'inset 4px 4px 10px rgba(0, 0, 0, 0.8), inset -2px -2px 6px rgba(255, 255, 255, 0.1)'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Consolas', 'monospace']
            }
        },
    },
    plugins: [],
}
