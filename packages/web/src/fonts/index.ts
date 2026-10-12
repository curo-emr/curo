import localFont from "next/font/local";

// Self-hosted so `next build` never fetches from Google Fonts (a dropped
// connection used to fail the Docker build). Latin subset, variable weight:
// the same files next/font/google served. Both fonts are OFL; see OFL-*.txt.

export const outfitSans = localFont({
  src: "./outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit-sans",
});

export const geistMono = localFont({
  src: "./geist-mono-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});
