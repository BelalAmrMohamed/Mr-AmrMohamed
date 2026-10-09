import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/Theme";
import SmoothScroll from "@/components/SmoothScroll";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const URL_ = "https://mr-amr-mohamed.vercel.app";

export const metadata = {
  metadataBase: new URL(URL_),
  title: "Amr Mohamed Ahmed — Senior English Language Expert & AUC Certified Trainer",
  description: "32 years of experience. AUC Certified Trainer specializing in IELTS, TOEFL, and Gulf region curricula.",
  keywords: ["English teacher", "IELTS", "TOEFL", "AUC certified", "English supervisor", "Gulf curriculum", "Egypt"],
  manifest: "/manifest.json",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
  openGraph: { type: "website", url: URL_, siteName: "Mr. Amr Mohamed Ahmed", title: "Tailored expertise for every learning journey", description: "Empowering students and educators across the Middle East with world-class English language expertise.", images: ["/assets/images/thumbnail.jpg"] },
  twitter: { card: "summary_large_image", images: ["/assets/images/thumbnail.jpg"] },
};
export const viewport = { themeColor: "#0a0e17" };

// Runs before paint: no theme flash. Defaults to dark, honours saved choice.
const noFlash = `try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        <link rel="stylesheet" href="/ai/chat.css" />
      </head>
      <body>
        <ThemeProvider><SmoothScroll />{children}</ThemeProvider>
        {/* Existing features, untouched: analytics beacon + AI assistant widget */}
        <script src="/js/analytics.js" defer />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.5/purify.min.js" defer />
        <script type="module" src="/ai/app.js" />
      </body>
    </html>
  );
}
