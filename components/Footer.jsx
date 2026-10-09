export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-fg/10 pt-16">
      <div className="container-x flex flex-wrap justify-between gap-4 text-sm text-muted">
        <p>Senior English Language Expert · AUC Certified Trainer · Ministry of Education Supervisor</p>
        <p>© {new Date().getFullYear()} Amr Mohamed Ahmed</p>
      </div>
      <p aria-hidden className="mt-8 select-none whitespace-nowrap text-center font-display text-[16vw] italic leading-[.8] text-fg/[.06]">Amr Mohamed</p>
    </footer>
  );
}
