import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obento Delivery · App del Repartidor",
  description: "Terminal oficial de reparto y navegación GPS para Obento Japanese Food",
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
  themeColor: "#c81e22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/images/logo-obento.png" />
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
