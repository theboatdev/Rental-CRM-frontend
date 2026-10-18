import './globals.css';
import { StoreProvider } from '../context/StoreContext';

export const metadata = {
  title: 'Shenaly Rent a Car — Operations Management',
  description: 'Precision architectural fleet management and rental operations portal for Sri Lanka.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FAFAFA] text-[#0A0A0C] font-sans antialiased selection:bg-[#FF4F00] selection:text-white">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
