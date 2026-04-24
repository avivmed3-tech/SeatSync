import { motion } from "framer-motion";

const images = [
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=400",
];

export function InfiniteMarquee() {
  return (
    <div className="w-full py-24 overflow-hidden relative border-y border-border/50 bg-background/50 backdrop-blur-md z-10" dir="ltr">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-20 pointer-events-none" />
      
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        className="flex gap-6 w-max"
      >
        {[...images, ...images, ...images].map((img, i) => (
          <div key={i} className="relative w-80 h-56 rounded-[2rem] overflow-hidden shadow-2xl border border-border group flex-shrink-0">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors z-10 duration-500" />
            <img src={img} alt="Event" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 border-[2px] border-gold/0 group-hover:border-gold/50 rounded-[2rem] z-20 transition-colors duration-500" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
