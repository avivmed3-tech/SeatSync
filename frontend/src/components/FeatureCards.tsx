import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { MouseEvent, useEffect, useRef } from "react";

const features = [
  {
    title: "ניהול מוזמנים אוטומטי",
    description: "סנכרון מלא, אישורי הגעה ישירות מהווטסאפ של האורחים ועדכונים בזמן אמת.",
    video: "/videos/event-management-flow.mp4",
  },
  {
    title: "סידורי הושבה חכמים",
    description: "ממשק ויזואלי לגרירה ושחרור. מונע טעויות, חוסך שעות ומבטיח שכולם מרוצים.",
    video: "/videos/event-management-flow.mp4",
  },
  {
    title: "הזמנות יוקרתיות",
    description: "עיצובים מרהיבים, מותאמים אישית עם אנימציות שנשלחות ישירות לנייד.",
    video: "/videos/seatsync-text-gold.mp4",
  },
  {
    title: "תזכורות ודיוור",
    description: "מערכת חכמה לשליחת Save the Date, הזמנות ותזכורות ניווט לווייז בלחיצה אחת.",
    icon: <MessageSquare className="w-8 h-8 text-gold-vivid" />,
  }
];

function VideoThumbnail({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      videoRef.current?.pause();
    }
  }, []);

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-background border border-border shadow-xl mb-8 group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-500">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function MagicCard({ feature, index }: { feature: any, index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: index * 0.15 }}
      onMouseMove={handleMouseMove}
      className="group relative flex flex-col justify-between p-10 rounded-[2.5rem] bg-card/80 backdrop-blur-md border border-border overflow-hidden hover:shadow-2xl hover:shadow-gold/5 transition-all duration-500"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(212, 168, 8, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      <div className="relative z-10">
        {feature.video ? (
          <VideoThumbnail src={feature.video} />
        ) : (
          <div className="w-20 h-20 rounded-3xl bg-background border border-border shadow-xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500">
            {feature.icon}
          </div>
        )}
        <h3 className="text-3xl font-bold mb-4 font-serif">{feature.title}</h3>
        <p className="text-foreground/60 text-lg leading-relaxed font-medium">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

export function FeatureCards() {
  return (
    <section className="py-40 px-4 max-w-7xl mx-auto relative z-10" dir="rtl">
      <div className="text-center mb-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-serif font-black mb-6"
        >
          חווית ניהול מליגה <span className="bg-gradient-gold bg-clip-text text-transparent">אחרת</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-foreground/60 max-w-3xl mx-auto text-xl md:text-2xl font-medium"
        >
          הטכנולוגיה המתקדמת ביותר בעולם האירועים, עטופה בממשק עוצר נשימה שפשוט כיף לעבוד איתו.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <MagicCard key={index} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
