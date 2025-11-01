import type { Metadata } from 'next';
import { Butcherman, Creepster, Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from './components/theme-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const creepster = Creepster({
  variable: '--font-creepster',
  subsets: ['latin'],
  weight: '400',
});

const butcherman = Butcherman({
  variable: '--font-butcherman',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'DND Battle Map',
  description: 'A collaborative DND battle map tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}  ${creepster.variable} ${butcherman.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
