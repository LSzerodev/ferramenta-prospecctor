import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mensagens no Zap - organize sua lista e fale com cada contato",
  description:
    "Envie seu JSON, separe quem e pessoa ou lugar, escreva mensagens com {nome} e {ramo}, e use o WhatsApp Web com ajuda do computador.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
