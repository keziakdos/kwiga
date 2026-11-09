import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwiga — Ma salle de classe",
  description:
    "Apprenez les réseaux informatiques à partir de vos propres documents, avec un tuteur IA textuel.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
