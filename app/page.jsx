import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Services from "@/components/Services";
import About from "@/components/About";
import Lesson from "@/components/Lesson";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav /><Hero /><Marquee /><Services /><About /><Lesson /><Contact /><Footer />
    </main>
  );
}
