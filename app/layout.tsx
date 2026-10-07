import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://deliveryobento.flowprintcorp.com"),
  title: "OBENTO · App de Reparto & Delivery",
  description: "Terminal oficial de reparto y navegación GPS para los riders de OBENTO Japanese Food.",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo-obento.png",
    apple: "/images/logo-obento.png",
  },
  openGraph: {
    title: "OBENTO · App de Reparto & Delivery",
    description: "Terminal oficial de reparto y navegación GPS para los riders de OBENTO Japanese Food.",
    url: "https://deliveryobento.flowprintcorp.com/",
    siteName: "OBENTO Delivery",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "https://deliveryobento.flowprintcorp.com/images/logo-obento.png",
        width: 800,
        height: 800,
        alt: "Obento Japanese Food",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBENTO · App de Reparto & Delivery",
    description: "Terminal oficial de reparto y navegación GPS para los riders de OBENTO Japanese Food.",
    images: ["https://deliveryobento.flowprintcorp.com/images/logo-obento.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Obento Rider",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Obento Rider" />
        <link rel="apple-touch-icon" href="/images/logo-obento.png" />
        <meta property="og:title" content="OBENTO · App de Reparto & Delivery" />
        <meta property="og:description" content="Terminal oficial de reparto y navegación GPS para los riders de OBENTO Japanese Food." />
        <meta property="og:image" content="https://deliveryobento.flowprintcorp.com/images/logo-obento.png" />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />
        <meta property="og:url" content="https://deliveryobento.flowprintcorp.com/" />
        <meta property="og:type" content="website" />
      </head>
      <body>
        {children}

        {/* Registro del Service Worker */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) {
                    console.log('✅ [PWA] Service Worker registrado:', reg.scope);
                  })
                  .catch(function(err) {
                    console.warn('⚠️ [PWA] Error en Service Worker:', err);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
