import type { Metadata, Viewport } from "next";
import { Albert_Sans, Bricolage_Grotesque, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const ui = Albert_Sans({ subsets: ["latin"], variable: "--font-albert", display: "swap" });
const code = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-spline-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DEVDOC", template: "%s · DEVDOC" },
  description: "Documentação, prompts e códigos do time, em markdown.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf0ec" },
    { media: "(prefers-color-scheme: dark)", color: "#08111f" },
  ],
};

// Applies the saved theme before paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem('devdoc-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${ui.variable} ${code.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="vitral" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
