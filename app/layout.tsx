import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://delivery.obentojapanesefood.es"),
  title: "OBENTO · App de Reparto & Delivery",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo-obento.png",
    apple: "/images/logo-obento.png",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Obento Rider" />
        <link rel="apple-touch-icon" href="/images/logo-obento.png" />
      </head>
      <body>
        {children}

        {/* Registro del Service Worker y bloqueo de zoom gestual para comportamiento App nativa */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            // Prevenir zoom gestual (pinch-to-zoom) en Safari / iOS
            document.addEventListener('gesturestart', function(e) {
              e.preventDefault();
            });

            // Prevenir doble toque para zoom
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(event) {
              const now = (new Date()).getTime();
              if (now - lastTouchEnd <= 300) {
                event.preventDefault();
              }
              lastTouchEnd = now;
            }, { passive: false });

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
