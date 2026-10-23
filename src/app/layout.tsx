import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Be_Vietnam_Pro,
  Montserrat,
  Lexend,
  Grenze_Gotisch,
  Sedgwick_Ave_Display,
  Black_Ops_One,
  Cormorant_Garamond,
  Philosopher,
  Yeseva_One,
  Charm,
  Noto_Serif_Display,
  Playfair_Display,
  Dancing_Script,
  Pacifico,
  Lobster,
  Amatic_SC,
  Merriweather,
  Oswald,
  Anton,
  Bungee,
  Fjalla_One,
  Barlow_Condensed,
  Saira_Condensed,
  Space_Grotesk,
  Tektur,
  Bangers,
  Sigmar_One,
  Roboto_Slab,
  Alfa_Slab_One,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font cho thumbnail YouTube (đều hỗ trợ tiếng Việt). Chỉ nạp khi thật sự dùng tới.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-title",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
});

const montserratFont = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const lexendFont = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const grenzeFont = Grenze_Gotisch({
  variable: "--font-grenze",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const sedgwickFont = Sedgwick_Ave_Display({
  variable: "--font-sedgwick",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const blackopsFont = Black_Ops_One({
  variable: "--font-blackops",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const cormorantFont = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  preload: false,
});

const philosopherFont = Philosopher({
  variable: "--font-philosopher",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  preload: false,
});

const yesevaFont = Yeseva_One({
  variable: "--font-yeseva",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const charmFont = Charm({
  variable: "--font-charm",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  preload: false,
});

const noto_displayFont = Noto_Serif_Display({
  variable: "--font-noto-display",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const playfairFont = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const dancingFont = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  preload: false,
});

const pacificoFont = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const lobsterFont = Lobster({
  variable: "--font-lobster",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const amaticFont = Amatic_SC({
  variable: "--font-amatic",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  preload: false,
});

const merriweatherFont = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const oswaldFont = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
  preload: false,
});

const antonFont = Anton({
  variable: "--font-anton",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const bungeeFont = Bungee({
  variable: "--font-bungee",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const fjallaFont = Fjalla_One({
  variable: "--font-fjalla",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const barlowFont = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const sairaFont = Saira_Condensed({
  variable: "--font-saira",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const spaceFont = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
  preload: false,
});

const tekturFont = Tektur({
  variable: "--font-tektur",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const bangersFont = Bangers({
  variable: "--font-bangers",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const sigmarFont = Sigmar_One({
  variable: "--font-sigmar",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

const roboto_slabFont = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "800", "900"],
  preload: false,
});

const alfaFont = Alfa_Slab_One({
  variable: "--font-alfa",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: "BookStudio — Audiobook Production Studio",
  description: "Studio-grade desktop audiobook production workstation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} ${montserratFont.variable} ${lexendFont.variable} ${grenzeFont.variable} ${sedgwickFont.variable} ${blackopsFont.variable} ${cormorantFont.variable} ${philosopherFont.variable} ${yesevaFont.variable} ${charmFont.variable} ${noto_displayFont.variable} ${playfairFont.variable} ${dancingFont.variable} ${pacificoFont.variable} ${lobsterFont.variable} ${amaticFont.variable} ${merriweatherFont.variable} ${oswaldFont.variable} ${antonFont.variable} ${bungeeFont.variable} ${fjallaFont.variable} ${barlowFont.variable} ${sairaFont.variable} ${spaceFont.variable} ${tekturFont.variable} ${bangersFont.variable} ${sigmarFont.variable} ${roboto_slabFont.variable} ${alfaFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
