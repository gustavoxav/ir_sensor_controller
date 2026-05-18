import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "IoT Occupancy Dashboard",
  description:
    "Dashboard em tempo real para monitoramento de ocupação e controle inteligente de iluminação",
  keywords: ["IoT", "ocupação", "dashboard", "ESP32", "MQTT"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Script para evitar flash de tema incorreto */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
