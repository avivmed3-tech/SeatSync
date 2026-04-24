import { useTheme } from './hooks/useTheme'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { Templates } from './components/Templates'
import { CTA } from './components/CTA'
import { Footer } from './components/Footer'
import './App.css'

function App() {
  const { theme, toggle } = useTheme()

  return (
    <>
      <Navbar theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Templates />
        <CTA />
      </main>
      <Footer />
    </>
  )
}

export default App
