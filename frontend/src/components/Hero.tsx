import { useEffect, useRef } from 'react'
import { ArrowRight, Play } from 'lucide-react'

export function Hero() {
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return
      const { left, top, width, height } = imageRef.current.getBoundingClientRect()
      const x = (e.clientX - left - width / 2) / width
      const y = (e.clientY - top - height / 2) / height
      imageRef.current.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg) scale(1.02)`
    }
    const handleMouseLeave = () => {
      if (!imageRef.current) return
      imageRef.current.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1)'
    }
    const el = imageRef.current
    el?.addEventListener('mousemove', handleMouseMove)
    el?.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el?.removeEventListener('mousemove', handleMouseMove)
      el?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <section className="hero-section" id="hero">
      <div className="hero-section__content">
        <div className="hero-badge blur-fade" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="hero-badge__dot" />
          New: AI-powered seating assistant
          <ArrowRight size={13} />
        </div>

        <h1 className="hero-section__headline blur-fade" style={{ '--delay': '80ms' } as React.CSSProperties}>
          Plan perfect events,
          <br />
          <span className="gradient-text">effortlessly</span>
        </h1>

        <p className="hero-section__sub blur-fade" style={{ '--delay': '160ms' } as React.CSSProperties}>
          From digital invitations to real-time RSVP tracking and smart seating charts —
          SeatSync handles every detail so you can enjoy the moment.
        </p>

        <div className="hero-section__ctas blur-fade" style={{ '--delay': '240ms' } as React.CSSProperties}>
          <a href="#cta" className="btn btn--primary btn--lg shimmer-btn">
            Start for free
            <ArrowRight size={16} />
          </a>
          <a href="#how-it-works" className="btn btn--ghost btn--lg">
            <span className="play-icon"><Play size={13} fill="currentColor" /></span>
            See how it works
          </a>
        </div>

        <p className="hero-section__social-proof blur-fade" style={{ '--delay': '320ms' } as React.CSSProperties}>
          <span className="hero-avatars">
            {['A', 'B', 'C', 'D'].map((l, i) => (
              <span key={i} className="hero-avatar" style={{ '--i': i } as React.CSSProperties}>{l}</span>
            ))}
          </span>
          Trusted by <strong>2,400+</strong> event planners worldwide
        </p>
      </div>

      <div className="hero-section__visual blur-fade" style={{ '--delay': '100ms' } as React.CSSProperties}>
        <div ref={imageRef} className="hero-section__mockup-wrap">
          <img
            src="/images/hero_dashboard.png"
            alt="SeatSync dashboard"
            className="hero-section__mockup"
            loading="eager"
          />
          <div className="hero-float hero-float--1">
            <img src="/images/mobile_rsvp.png" alt="Mobile RSVP" />
          </div>
          <div className="hero-float hero-float--2">
            <div className="mini-stat">
              <span className="mini-stat__num">94%</span>
              <span className="mini-stat__label">RSVP rate</span>
            </div>
          </div>
          <div className="hero-float hero-float--3">
            <div className="mini-stat">
              <span className="mini-stat__icon">✓</span>
              <span className="mini-stat__label">Seating confirmed</span>
            </div>
          </div>
        </div>

        <div className="hero-section__glow" aria-hidden="true" />
      </div>
    </section>
  )
}
