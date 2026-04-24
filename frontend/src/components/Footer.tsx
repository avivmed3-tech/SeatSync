export function Footer() {
  const year = new Date().getFullYear()

  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Templates', href: '#templates' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Pricing', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
        { label: 'Cookies', href: '#' },
      ],
    },
  ]

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="var(--accent)" />
              <path d="M7 10h14M7 14h10M7 18h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>SeatSync</span>
          </div>
          <p className="footer__tagline">Every seat, perfectly placed.</p>
        </div>

        <div className="footer__cols">
          {cols.map(col => (
            <div key={col.title} className="footer__col">
              <p className="footer__col-title">{col.title}</p>
              <ul>
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="footer__link">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {year} SeatSync. All rights reserved.</p>
      </div>
    </footer>
  )
}
