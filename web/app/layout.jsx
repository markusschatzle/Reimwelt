import "../src/styles.css";
import { ThemeProvider } from "../src/ThemeContext.jsx";
import { OG_IMAGE } from "../src/seo.js";

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
        {/* Preconnect to AdSense CDN so the connection is ready when the script loads */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        {/*
          Preload the fonts that PageSpeed identifies in the critical chain.
          Without preload, these are only discovered after the full CSS parses —
          on slow mobile that costs 600-700ms per font.
        */}
        <link rel="preload" as="font" type="font/woff2" href="/fonts/dmsans-normal-latin.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/fraunces-normal-latin.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/fraunces-italic-400-latin.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/jetbrainsmono-normal-400-latin.woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/*
          Consent Mode v2 — set ALL storage to "denied" synchronously before
          any ad script loads. AppShell calls initConsent() which will later
          update this based on the user's stored choice or show the banner.
        */}
        <script dangerouslySetInnerHTML={{ __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
        `.trim() }} />
        {/* AdSense — must be in <head> for crawler detection. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5557701409459816"
          crossOrigin="anonymous"
        />
      </head>
      {/* GA4 is loaded by consent.js (via NEXT_PUBLIC_GA_ID) after the user
          accepts cookies — do NOT add hardcoded gtag scripts here. */}
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
