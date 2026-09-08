/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sentinel: {
                    bg: '#090d16',
                    card: '#0f172a',
                    border: '#1e293b',
                    accent: '#0284c7',
                    emerald: '#10b981',
                    amber: '#f59e0b',
                    orange: '#f97316',
                    rose: '#f43f5e',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Consolas', 'monospace']
            }
        },
    },
    plugins: [],
}
