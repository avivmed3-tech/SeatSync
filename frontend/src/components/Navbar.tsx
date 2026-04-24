import { useState, useEffect } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'

interface NavbarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#templates', label: 'Templates' },
  ]

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href="#" className="navbar__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="var(--accent)" />
            <path d="M7 10h14M7 14h10M7 18h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>SeatSync</span>
        </a>

        <nav className="navbar__links" aria-label="Main navigation">
          {links.map(l => (
            <a key={l.href} href={l.href} className="navbar__link">{l.label}</a>
          ))}
        </nav>

        <div className="navbar__actions">
          <button
            className="navbar__theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark'
              ? <Sun size={18} strokeWidth={1.8} />
              : <Moon size={18} strokeWidth={1.8} />
            }
          </button>
          <a href="#cta" className="btn btn--primary btn--sm">Get started</a>
          <button
            className="navbar__hamburger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="navbar__mobile">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="navbar__mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a href="#cta" className="btn btn--primary" onClick={() => setMobileOpen(false)}>
            Get started
          </a>
        </div>
      )}
    </header>
  )
}
