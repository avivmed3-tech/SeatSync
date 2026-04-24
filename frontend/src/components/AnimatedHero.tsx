import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { Moon, Sun, ChevronRight, Sparkles } from "lucide-react";

const words = "ניהול אירועים חכם ומדויק.".split(" ");

export function AnimatedHero() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="relative min-h-screen flex flex-col items-center pt-32 pb-12 overflow-hidden px-4" dir="rtl">
      
      {/* Glassmorphism Nav */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl rounded-[2rem] bg-background/50 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-4 flex justify-between items-center z-50 shadow-2xl transition-colors duration-500">
        <div className="flex items-center gap-3 px-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-[0_0_20px_rgba(212,168,8,0.3)]">
            <Sparkles className="text-black w-6 h-6" />
          </div>
          <span className="text-3xl font-black tracking-tight font-serif">Seat<span className="text-gold-dark">Sync</span></span>
        </div>
        <div className="flex items-center gap-6 px-2">
          <button className="hidden md:flex items-center gap-2 text-base font-bold hover:text-gold transition-colors">
            התחברות
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-gold-vivid" /> : <Moon className="w-5 h-5 text-slate-800" />}
          </button>
        </div>
      </nav>

      <div className="z-10 text-center max-w-5xl mx-auto flex flex-col items-center mt-10 md:mt-20">
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative inline-flex mb-12"
        >
          <div className="absolute inset-0 bg-gold-vivid/30 blur-2xl rounded-full"></div>
          <div className="relative flex items-center gap-3 px-6 py-2.5 rounded-full border border-gold/40 bg-background/80 backdrop-blur-md text-sm font-bold shadow-[0_0_30px_rgba(212,168,8,0.2)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-vivid opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold-vivid"></span>
            </span>
            <span className="bg-gradient-gold bg-clip-text text-transparent text-base">הטכנולוגיה החדשה של 2026</span>
          </div>
        </motion.div>

        {/* Text Reveal Heading */}
        <h1 className="text-6xl md:text-[6rem] font-serif font-black tracking-tighter mb-8 leading-[1.1] flex flex-wrap justify-center gap-x-5">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 50, filter: "blur(15px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: i * 0.15, ease: [0.2, 0.65, 0.3, 0.9] }}
              className={word.includes("חכם") || word.includes("ומדויק.") ? "bg-gradient-gold bg-clip-text text-transparent drop-shadow-sm" : "text-foreground drop-shadow-sm"}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="text-2xl md:text-3xl text-foreground/60 max-w-4xl mb-16 font-medium leading-relaxed"
        >
          מערכת פרימיום לניהול אישורי הגעה, סידורי הושבה, ושליחת הזמנות.
          הכלים המתקדמים ביותר לאירוע מושלם ונטול לחצים.
        </motion.p>

        {/* Premium Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
        >
          <button className="group relative px-10 py-5 rounded-[2rem] bg-foreground text-background font-bold text-xl overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(212,168,8,0.4)] transition-all duration-500 hover:scale-105 active:scale-95">
            <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-center gap-2 group-hover:text-black transition-colors duration-500">
              התחל עכשיו בחינם
              <ChevronRight className="w-6 h-6 group-hover:-translate-x-2 transition-transform duration-500" />
            </div>
          </button>
          <button className="px-10 py-5 rounded-[2rem] bg-background/50 backdrop-blur-md border-[2px] border-border hover:border-gold/50 text-foreground font-bold text-xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,168,8,0.15)] active:scale-95">
            קבע הדגמה אישית
          </button>
        </motion.div>

        {/* Dashboard Mockup Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 150, rotateX: 30 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.5, delay: 1.2, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="mt-32 relative w-full max-w-6xl aspect-[16/9] rounded-[2.5rem] border-[1px] border-white/20 dark:border-white/10 bg-card/40 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden [perspective:2000px] hover:shadow-[0_40px_120px_rgba(212,168,8,0.15)] transition-shadow duration-700"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-gold-vivid/10 via-transparent to-transparent opacity-60"></div>
          {/* Mockup Header */}
          <div className="absolute top-0 left-0 w-full h-16 border-b border-border/50 flex items-center px-8 gap-3 bg-background/50">
            <div className="w-3.5 h-3.5 rounded-full bg-red-400/90 shadow-sm"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400/90 shadow-sm"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400/90 shadow-sm"></div>
          </div>
          {/* Mockup Content */}
          <div className="absolute top-24 left-10 right-10 bottom-10 flex gap-8">
             <div className="w-1/4 h-full rounded-3xl bg-background/50 border border-border/50 p-6 flex flex-col gap-4">
               <div className="w-full h-8 rounded-lg bg-border/40"></div>
               <div className="w-3/4 h-8 rounded-lg bg-border/40"></div>
               <div className="w-5/6 h-8 rounded-lg bg-border/40"></div>
             </div>
             <div className="w-3/4 flex flex-col gap-8">
                <div className="w-full h-40 rounded-3xl bg-background/50 border border-border/50 flex items-center p-8 gap-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-gold shadow-lg shadow-gold/20 flex-shrink-0 animate-pulse"></div>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="w-1/3 h-6 rounded-md bg-border/60"></div>
                    <div className="w-1/2 h-4 rounded-md bg-border/40"></div>
                  </div>
                </div>
                <div className="w-full h-full rounded-3xl bg-background/50 border border-border/50 flex flex-wrap p-8 gap-6">
                   <div className="w-32 h-32 rounded-2xl border-2 border-gold/30 bg-gold/5"></div>
                   <div className="w-32 h-32 rounded-2xl bg-border/30"></div>
                   <div className="w-32 h-32 rounded-2xl bg-border/30"></div>
                </div>
             </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
