import './globals.css';

export const metadata = {
  icons: {
    icon: '/assets/fynix-logo-mark.png',
    shortcut: '/assets/fynix-logo-mark.png',
    apple: '/assets/fynix-logo-mark.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
