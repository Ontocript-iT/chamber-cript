import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class", // අනිවාර්යයි: 'next-themes' සඳහා
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                brand: {
                    DEFAULT: "var(--brand)",
                    dark: "var(--brand-dark)",
                    light: "var(--brand-light)",
                },
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(42, 54, 66, 0.05)',
                'heavy': '0 10px 30px -5px rgba(42, 54, 66, 0.2)',
            }
        },
    },
    plugins: [],
};

export default config;