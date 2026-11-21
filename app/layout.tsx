import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Chambercript - Legal Practice Management System",
    description: "Secure and efficient case, task, and staff management for modern law firms.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    // සටහන: suppressHydrationWarning මගින් Theme වෙනස් වීමේදී එන warning මඟ හරවයි
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased transition-colors duration-300`}>
        <ThemeProvider>
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}