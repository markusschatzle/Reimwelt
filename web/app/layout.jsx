import "../src/styles.css";
import { ThemeProvider } from "../src/ThemeContext.jsx";
import { OG_IMAGE } from "../src/seo.js";
import Script from "next/script";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://reimwelt.de";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Reimwelt – phonetische Reimsuche",
    template: "%s · Reimwelt",
  },
  description:
    "Reimwelt findet phonetisch passende Reime auf deutsche und englische Wörter – mit Lautschrift, Metrum und Worthäufigkeit.",
  icons: { icon: "/icons/favicon.svg" },
  // Default social-share metadata; pages that set their own openGraph re-include
  // OG_IMAGE so the preview image is present everywhere.
  openGraph: {
    type: "website",
    siteName: "Reimwelt",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
  },
};

// Set <html data-theme> before paint so there is no flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-TLZWWNL4M7"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TLZWWNL4M7');
        `}
      </Script>
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5557701409459816"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
