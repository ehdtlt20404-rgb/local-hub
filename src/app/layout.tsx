import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "동네허브 - 우리 동네 생활정보 한눈에",
  description: "동네허브에서 내 동네 날씨, 미세먼지, 부동산 실거래가, 편의시설, 맛집, 버스 정보를 지도에서 한눈에 확인하세요. 아파트·빌라·원룸 실거래가 조회 무료 제공.",
  keywords: ["동네정보", "부동산 실거래가", "아파트 시세", "동네 날씨", "미세먼지", "편의시설 찾기", "맛집", "지역 생활정보", "동네허브"],
  authors: [{ name: "동네허브" }],
  creator: "동네허브",
  metadataBase: new URL("https://dongnehub.com"),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://dongnehub.com",
    siteName: "동네허브",
    title: "동네허브 - 우리 동네 생활정보 한눈에",
    description: "날씨·미세먼지·부동산 실거래가·편의시설·맛집까지. 내 동네 정보를 지도에서 바로 확인하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "동네허브 - 우리 동네 생활정보",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "동네허브 - 우리 동네 생활정보 한눈에",
    description: "날씨·미세먼지·부동산 실거래가·편의시설·맛집까지. 내 동네 정보를 지도에서 바로 확인하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
