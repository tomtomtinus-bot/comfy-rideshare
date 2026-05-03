export const Footer = () => {
  return (
    <footer id="contact" className="bg-brass-deep py-16 md:py-20 px-6 md:px-8 text-parchment/60">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-6 bg-brass-gold rounded-full" />
            <span className="font-display text-xl tracking-tight text-parchment italic">
              Konvooi
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            Het netwerk voor convoi exceptionnel: gecertificeerde
            verkeersregelaars met pilotvoertuig, beschikbaar voor planbare en
            spoedeisende transportbegeleiding.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-12 md:gap-16">
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">Netwerk</p>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-brass-gold transition-colors">Begeleiders</a></li>
              <li><a href="#" className="hover:text-brass-gold transition-colors">Categorieën</a></li>
              <li><a href="#" className="hover:text-brass-gold transition-colors">Werkgebied</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">Contact</p>
            <ul className="text-sm space-y-2 tabular-nums">
              <li>+31 20 555 0192</li>
              <li>Hornweg 18</li>
              <li>1044 AN Amsterdam</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-parchment/10 flex flex-col md:flex-row gap-3 justify-between items-center text-[10px] uppercase tracking-widest">
        <span>© 2026 Konvooi · Convoi Exceptionnel</span>
        <span>Veilig over de weg</span>
      </div>
    </footer>
  );
};
