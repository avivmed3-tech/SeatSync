import { ThemeProvider } from "./components/ThemeProvider"
import { AnimatedHero } from "./components/AnimatedHero"
import { FeatureCards } from "./components/FeatureCards"
import { AdvancedBackground } from "./components/BackgroundElements"
import { InfiniteMarquee } from "./components/InfiniteMarquee"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="seatsync-theme">
      <div className="min-h-screen bg-transparent text-foreground relative selection:bg-gold/30">
        <AdvancedBackground />
        
        <main className="relative z-10">
          <AnimatedHero />
          <InfiniteMarquee />
          <FeatureCards />
        </main>
        
        <footer className="relative z-10 py-16 text-center text-foreground/50 text-sm border-t border-border mt-20 bg-background/80 backdrop-blur-lg">
          <p className="font-serif text-3xl mb-6 font-black bg-gradient-gold bg-clip-text text-transparent">SeatSync</p>
          <p className="text-base">© {new Date().getFullYear()} SeatSync. כל הזכויות שמורות.</p>
        </footer>
      </div>
    </ThemeProvider>
  )
}

export default App
