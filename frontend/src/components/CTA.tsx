import { ArrowRight } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function CTA() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section
      id="cta"
      ref={ref as React.RefObject<HTMLElement>}
      className={`cta-section blur-fade${isVisible ? ' visible' : ''}`}
    >
      <div className="cta-section__beam" aria-hidden="true" />
      <div className="cta-section__inner">
        <span className="cta-section__badge">Free forever for small events</span>
        <h2 className="cta-section__title">
          Ready to make your next event <span className="gradient-text">unforgettable?</span>
        </h2>
        <p className="cta-section__sub">
          Join thousands of planners who use SeatSync to run smoother, more memorable events.
          No credit card required.
        </p>
        <div className="cta-section__actions">
          <a href="#" className="btn btn--primary btn--lg shimmer-btn">
            Get started for free
            <ArrowRight size={16} />
          </a>
          <a href="#" className="btn btn--ghost btn--lg">Schedule a demo</a>
        </div>
        <p className="cta-section__note">Setup in under 5 minutes · No credit card required</p>
      </div>
    </section>
  )
}
