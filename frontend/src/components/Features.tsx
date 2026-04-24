import { Mail, Users, LayoutGrid, Mic, RefreshCw, BarChart2 } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const features = [
  {
    icon: <Mail size={22} />,
    title: 'Beautiful Invitations',
    desc: 'Design stunning digital invites from 30+ curated templates. Personalize every detail and send in seconds.',
  },
  {
    icon: <Users size={22} />,
    title: 'Smart RSVP Tracking',
    desc: 'Guests respond with one tap. See attendance stats update live on your dashboard.',
  },
  {
    icon: <LayoutGrid size={22} />,
    title: 'Drag & Drop Seating',
    desc: 'Build your floor plan visually. Assign guests to tables and handle last-minute changes instantly.',
  },
  {
    icon: <Mic size={22} />,
    title: 'AI Voice Assistant',
    desc: 'Let guests RSVP by phone. Our AI captures their details and updates your list automatically.',
  },
  {
    icon: <RefreshCw size={22} />,
    title: 'Real-time Updates',
    desc: 'Every change syncs instantly across your team. No more spreadsheet conflicts or stale data.',
  },
  {
    icon: <BarChart2 size={22} />,
    title: 'Event Analytics',
    desc: 'Track open rates, RSVP trends, and guest preferences to make every event better than the last.',
  },
]

function FeatureCard({ icon, title, desc, index }: typeof features[0] & { index: number }) {
  const { ref, isVisible } = useScrollAnimation()
  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      className={`feature-card blur-fade${isVisible ? ' visible' : ''}`}
      style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}
    >
      <div className="feature-card__icon">{icon}</div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__desc">{desc}</p>
    </article>
  )
}

export function Features() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="features" className="section">
      <div className="section__header">
        <p
          ref={ref as React.RefObject<HTMLParagraphElement>}
          className={`section__label blur-fade${isVisible ? ' visible' : ''}`}
        >
          Features
        </p>
        <h2 className={`section__title blur-fade${isVisible ? ' visible' : ''}`} style={{ '--delay': '60ms' } as React.CSSProperties}>
          Everything you need for a flawless event
        </h2>
        <p className={`section__sub blur-fade${isVisible ? ' visible' : ''}`} style={{ '--delay': '120ms' } as React.CSSProperties}>
          One platform that replaces spreadsheets, emails, and guesswork.
        </p>
      </div>

      <div className="features-grid">
        {features.map((f, i) => (
          <FeatureCard key={f.title} {...f} index={i} />
        ))}
      </div>
    </section>
  )
}
