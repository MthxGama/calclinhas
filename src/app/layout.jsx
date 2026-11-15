import '../index.css';

export const metadata = {
  title: 'Ateliê Crochê & Linhas — Gestão e Precificação',
  description:
    'Sistema completo para cadastro de rolos de linha, produtos de crochê, cálculo de peso de linhas e valor da hora de trabalho.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CalcLinhas',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C85A32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
