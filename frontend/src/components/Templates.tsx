import { useScrollAnimation } from '../hooks/useScrollAnimation'

const templates = [
  { name: 'Botanical', img: '/images/template_botanical.png' },
  { name: 'Classic', img: '/images/template_classic.png' },
  { name: 'Boho Arch', img: '/images/template_boho_arch.png' },
  { name: 'Dusty Rose', img: '/images/template_dusty_rose.png' },
  { name: 'Dark Floral', img: '/images/template_dark_floral.png' },
  { name: 'Bluebird', img: '/images/template_bluebird.png' },
]

function TemplateCard({ name, img, index }: { name: string; img: string; index: number }) {
  const { ref, isVisible } = useScrollAnimation()
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`template-card blur-fade${isVisible ? ' visible' : ''}`}
      style={{ '--delay': `${index * 60}ms` } as React.CSSProperties}
    >
      <div className="template-card__img-wrap">
        <img src={img} alt={name} className="template-card__img" loading="lazy" />
        <div className="template-card__overlay">
          <span className="template-card__cta">Use template</span>
        </div>
      </div>
      <p className="template-card__name">{name}</p>
    </div>
  )
}

export function Templates() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="templates" className="section">
      <div className="section__header">
        <p
          ref={ref as React.RefObject<HTMLParagraphElement>}
          className={`section__label blur-fade${isVisible ? ' visible' : ''}`}
        >
          Templates
        </p>
        <h2
          className={`section__title blur-fade${isVisible ? ' visible' : ''}`}
          style={{ '--delay': '60ms' } as React.CSSProperties}
        >
          Invitations your guests will love
        </h2>
        <p
          className={`section__sub blur-fade${isVisible ? ' visible' : ''}`}
          style={{ '--delay': '120ms' } as React.CSSProperties}
        >
          30+ professionally designed templates — fully customizable, always beautiful.
        </p>
      </div>

      <div className="templates-grid">
        {templates.map((t, i) => (
          <TemplateCard key={t.name} {...t} index={i} />
        ))}
      </div>
    </section>
  )
}
