import { useScrollAnimation } from '../hooks/useScrollAnimation'

const steps = [
  {
    num: '01',
    title: 'Create your event',
    desc: 'Set your date, venue, and style. SeatSync generates a personalized event page in minutes.',
    img: '/images/step1.png',
  },
  {
    num: '02',
    title: 'Send invitations',
    desc: 'Pick a template, customize the wording, and send to your guest list via WhatsApp, email, or link.',
    img: '/images/step2.png',
  },
  {
    num: '03',
    title: 'Collect RSVPs',
    desc: 'Guests RSVP online or by phone. Every response lands in your dashboard instantly.',
    img: '/images/step3.png',
  },
  {
    num: '04',
    title: 'Manage seating',
    desc: 'Drag guests into tables, export a printable chart, and keep everyone in the loop automatically.',
    img: '/images/step4.png',
  },
]

function Step({ num, title, desc, img, index }: typeof steps[0] & { index: number }) {
  const { ref, isVisible } = useScrollAnimation()
  const isEven = index % 2 === 1

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`how-step blur-fade${isVisible ? ' visible' : ''}${isEven ? ' how-step--reverse' : ''}`}
      style={{ '--delay': '0ms' } as React.CSSProperties}
    >
      <div className="how-step__text">
        <span className="how-step__num">{num}</span>
        <h3 className="how-step__title">{title}</h3>
        <p className="how-step__desc">{desc}</p>
      </div>
      <div className="how-step__image-wrap">
        <img src={img} alt={title} className="how-step__image" loading="lazy" />
      </div>
    </div>
  )
}

export function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="how-it-works" className="section section--muted">
      <div className="section__header">
        <p
          ref={ref as React.RefObject<HTMLParagraphElement>}
          className={`section__label blur-fade${isVisible ? ' visible' : ''}`}
        >
          How it works
        </p>
        <h2 className={`section__title blur-fade${isVisible ? ' visible' : ''}`} style={{ '--delay': '60ms' } as React.CSSProperties}>
          From zero to event-ready in minutes
        </h2>
      </div>

      <div className="how-steps">
        {steps.map((s, i) => <Step key={s.num} {...s} index={i} />)}
      </div>
    </section>
  )
}
