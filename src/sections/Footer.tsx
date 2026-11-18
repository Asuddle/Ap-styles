import { site, ph } from '../lib/config'
import { Star } from '../components/Nav'

export function Footer() {
  const s = site.brand.social
  const link = (href: string, label: string) =>
    href ? <a href={href} rel="noopener" target="_blank">{label}</a> : <a href="#" aria-disabled="true" onClick={(e) => e.preventDefault()}>{label} <span className="ph">[LINK]</span></a>
  return (
    <footer data-section="footer" data-flow="1" className="footer">
      <div className="footer-brand">
        <Star size={36} />
        <span className="display wordmark-static">AP-STAR</span>
      </div>
      <nav aria-label="Footer" className="footer-links mono">
        {link(s.instagram, 'Instagram')}
        {link(s.tiktok, 'TikTok')}
        {link('', 'Shipping & returns')}
        {link('', 'Privacy')}
        {link('', 'Terms')}
      </nav>
      <p className="mono label muted">{`Site by ${ph(site.brand.studio, 'STUDIO')}`}</p>
    </footer>
  )
}
