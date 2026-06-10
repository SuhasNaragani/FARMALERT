import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'motion/react'
import { Sprout, MapPin, Radio, FileText, ArrowRight, UserCircle, Check, Heart, Languages, Orbit } from 'lucide-react'
import AnalysePage from './pages/AnalysePage.jsx'
import MyFarmsPage from './pages/MyFarmsPage.jsx'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PHOTOS = {
  hero:    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80',
  problem: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80',
  farmer:  'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1200&q=80',
  footer:  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80',
}

// Inline font-family helpers
const F = {
  playfair: "'Playfair Display', Georgia, serif",
  inter:    "'Inter', system-ui, sans-serif",
  mono:     "'Space Mono', 'Courier New', monospace",
  telugu:   "'Noto Sans Telugu', sans-serif",
}

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────

function useCountUp(target, startDelay = 1400) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1800
      const start = Date.now()
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        setCount(Math.floor(ease * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, startDelay)
    return () => clearTimeout(timeout)
  }, [target, startDelay])
  return count
}

// ─────────────────────────────────────────────────────────────
// REUSABLE: SCROLL REVEAL
// ─────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '', style = {}, as = 'div' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })
  const Tag = motion[as] || motion.div
  return (
    <Tag
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────
// REUSABLE: SECTION TAG
// ─────────────────────────────────────────────────────────────

function Tag({ children, className = '' }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: F.mono,
        fontSize: '11px',
        color: '#f59e0b',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '20px',
      }}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'transparent' }}
    >
      <div className="px-0 py-4 flex items-center justify-end">

        {/* Glass pill — desktop only, right aligned */}
        <div
          className="hidden md:flex items-center"
          style={{
            marginRight: '40px',
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '100px',
            padding: '8px 8px 8px 24px',
            gap: '28px',
          }}
        >
          {[
            { label: 'HOME',            href: '#' },
            { label: 'HOW IT WORKS',    href: '#how-it-works' },
            { label: 'ANALYSE MY FARM', href: '/analyse' },
            { label: 'MY FARMS',        href: '/my-farms' },
            { label: 'ABOUT',           href: '#about' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={link.label === 'ABOUT' ? (e) => { e.preventDefault(); document.getElementById('about').scrollIntoView({ behavior: 'smooth', block: 'end' }) } : undefined}
              style={{
                fontFamily: F.inter,
                fontSize: '13px',
                fontWeight: 500,
                color: '#ffffff',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {link.label}
            </a>
          ))}

          {/* Profile icon */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.querySelector('svg').style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.querySelector('svg').style.color = 'rgba(255,255,255,0.8)'}
          >
            <UserCircle size={28} color="#f59e0b" strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="md:hidden cursor-pointer"
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', padding: '4px' }}
        >
          <div style={{ width: '24px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  height: '2px',
                  background: '#fff',
                  borderRadius: '1px',
                  transition: 'transform 0.3s, opacity 0.3s',
                  display: 'block',
                  transform: menuOpen
                    ? i === 0 ? 'translateY(7px) rotate(45deg)'
                    : i === 2 ? 'translateY(-7px) rotate(-45deg)'
                    : 'scaleX(0)'
                    : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mx-4 mb-3 rounded-3xl overflow-hidden flex flex-col gap-3 px-6 py-5"
            style={{ background: 'rgba(10,26,10,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {[
              { label: 'Home',            href: '#' },
              { label: 'How It Works',    href: '#how-it-works' },
              { label: 'Analyse My Farm', href: '/analyse' },
              { label: 'My Farms',        href: '/my-farms' },
              { label: 'About',           href: '#about' },
            ].map(link => (
              <a key={link.label} href={link.href} onClick={link.label === 'About' ? (e) => { e.preventDefault(); setMenuOpen(false); document.getElementById('about').scrollIntoView({ behavior: 'smooth', block: 'end' }) } : () => setMenuOpen(false)}
                style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                {link.label}
              </a>
            ))}
            <a href="/analyse" onClick={() => setMenuOpen(false)}
              style={{ fontFamily: F.inter, fontSize: '14px', fontWeight: 600, color: '#0a1a0a', background: '#f59e0b', padding: '12px 20px', borderRadius: '100px', textDecoration: 'none', textAlign: 'center', marginTop: '4px' }}>
              Analyse My Farm →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─────────────────────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative flex flex-col overflow-hidden" style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#0a1a0a' }}>

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-bg-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Hero content — bottom left, cinematic film-poster positioning */}
      <div
        className="absolute z-10"
        style={{
          bottom: 'clamp(80px, 14vh, 160px)',
          left: 'clamp(24px, 8vw, 120px)',
          maxWidth: 'clamp(320px, 55vw, 720px)',
        }}
      >
        {/* Telugu eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontFamily: F.telugu,
            fontSize: 'clamp(22px, 2.8vw, 32px)',
            color: '#ffffff',
            fontWeight: 600,
            lineHeight: 1.6,
            marginBottom: '16px',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          మీ పొలం మా బాధ్యత.
        </motion.p>

        {/* Main headline */}
        <div style={{ lineHeight: 0.92 }}>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: F.playfair,
              fontSize: 'clamp(58px, 8.5vw, 108px)',
              fontWeight: 700,
              color: '#fffbf0',
              margin: 0,
              display: 'block',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
          >
            Your Farm.
          </motion.h1>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: F.playfair,
              fontSize: 'clamp(58px, 8.5vw, 108px)',
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#f59e0b',
              margin: 0,
              display: 'block',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
          >
            Stays Safe.
          </motion.h1>
        </div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontFamily: F.inter,
            fontSize: 'clamp(15px, 1.6vw, 20px)',
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 400,
            lineHeight: 1.7,
            maxWidth: '600px',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            marginTop: '16px',
            marginBottom: '32px',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          Hyper-local climate risk forecasts. AI adaptation plans. In Telugu. Free.
        </motion.p>

        {/* CTA button */}
        <motion.a
          href="/analyse"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 35px rgba(245,158,11,0.5)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-block',
            fontFamily: F.inter,
            fontSize: '16px',
            fontWeight: 600,
            color: '#0a1a0a',
            background: '#f59e0b',
            borderRadius: '100px',
            padding: '16px 40px',
            textDecoration: 'none',
            textShadow: 'none',
          }}
        >
          Analyse My Farm →
        </motion.a>
      </div>

      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, transparent, #000000)', zIndex: 2, pointerEvents: 'none' }} />

    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// [REMOVED: ProblemSection, old HowItWorksSection, RiskTypesSection]
// ─────────────────────────────────────────────────────────────

function _DEAD_ProblemSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })

  const stats = [
    { number: '50+',         label: 'Average farmer age in Telangana' },
    { number: '↓ Below',     label: '2026 monsoon forecast — below normal' },
    { number: '40°C+',       label: 'Heatwave days increasing yearly' },
    { number: '0',           label: 'Free hyper-local tools before FarmAlert' },
  ]

  return (
    <section ref={ref} style={{ background: '#0a1a0a', minHeight: '100vh' }}>
      <div
        className="grid grid-cols-1 lg:grid-cols-2"
        style={{ minHeight: '100vh' }}
      >
        {/* Left panel — content */}
        <div
          className="flex flex-col justify-center order-2 lg:order-1"
          style={{
            background: '#0a1a0a',
            padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Tag>[ The Reality ]</Tag>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1 }}
            style={{ marginBottom: '28px' }}
          >
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.2, color: '#fffbf0', margin: 0 }}>
              Telangana farmers face
            </h2>
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.2, color: '#f59e0b', margin: 0 }}>
              a compounding crisis.
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.2 }}
            style={{ fontFamily: F.inter, fontSize: '17px', color: 'rgba(255,251,240,0.62)', lineHeight: 1.82, maxWidth: '420px', marginBottom: '44px' }}
          >
            Erratic monsoons. Rising heatwaves. Ageing farmers with no access to hyper-local data. Generic government advisories that ignore your specific plot, crop, and soil.
          </motion.p>

          {/* Stats stacked */}
          <div>
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -24 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                className="stat-divider"
              >
                <div style={{ fontFamily: F.playfair, fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 700, color: '#f59e0b', lineHeight: 1.1, marginBottom: '4px' }}>
                  {stat.number}
                </div>
                <div style={{ fontFamily: F.inter, fontSize: '14px', color: 'rgba(255,251,240,0.55)', marginBottom: '16px' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel — photo */}
        <div className="relative order-1 lg:order-2" style={{ minHeight: '45vh' }}>
          <img
            src={PHOTOS.problem}
            alt="Aerial view of farm fields in Telangana showing scale of agriculture"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Left-bleed overlay to blend into dark left panel */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: 'linear-gradient(to left, transparent 55%, #0a1a0a 100%)' }}
          />
          {/* Bottom fade */}
          <div
            className="absolute inset-0 lg:hidden"
            aria-hidden="true"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, #0a1a0a 100%)' }}
          />

          {/* Marbam-style stats overlaid on photo — desktop only */}
          <div className="absolute bottom-8 left-8 flex-col gap-3 hidden lg:flex">
            {[
              { tag: '01', stat: 'Below Normal Monsoon', sub: '2026 forecast' },
              { tag: '02', stat: '3x More Heatwave Days', sub: 'vs 10 years ago' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.65 + i * 0.15 }}
                className="flex items-center gap-3 rounded-full px-4 py-2"
                style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)' }}
              >
                <span style={{ fontFamily: F.mono, fontSize: '10px', color: '#f59e0b' }}>[{item.tag}]</span>
                <span style={{ fontFamily: F.mono, fontSize: '12px', color: '#ffffff', fontWeight: 700 }}>{item.stat}</span>
                <span style={{ fontFamily: F.mono, fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>/ {item.sub}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// HOW IT WORKS SECTION
// ─────────────────────────────────────────────────────────────

function _DEAD_OldHowItWorksSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })

  const steps = [
    {
      icon: <MapPin size={28} color="#f59e0b" strokeWidth={1.5} />,
      num: '01',
      title: 'Tell Us Your Farm',
      telugu: 'మీ పొలం వివరాలు చెప్పండి',
      body: 'Enter your village, crop type, and plot size. Takes 30 seconds.',
    },
    {
      icon: <Radio size={28} color="#f59e0b" strokeWidth={1.5} />,
      num: '02',
      title: 'We Fetch Live Data',
      telugu: 'మేము డేటా తీసుకుంటాము',
      body: 'Our system pulls 14-day hyper-local weather, soil moisture, and satellite data for your exact farm location.',
    },
    {
      icon: <FileText size={28} color="#f59e0b" strokeWidth={1.5} />,
      num: '03',
      title: 'Get Your Adaptation Plan',
      telugu: 'మీ ప్రణాళిక తయారవుతుంది',
      body: 'AI generates a ranked action plan specific to your crop, soil, and incoming risks. In Telugu and English.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="relative py-24 px-6 overflow-hidden"
      style={{ background: '#0d1a0d' }}
      ref={ref}
    >
      {/* Grain texture overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          opacity: 0.035,
          zIndex: 0,
        }}
      />

      {/* Farmer photo ghost bg for cinematic depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.07, zIndex: 0 }}
      >
        <img src={PHOTOS.farmer} alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: '#0d1a0d', opacity: 0.6 }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <Reveal delay={0}>
            <Tag className="text-center">[ How It Works ]</Tag>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(32px, 5vw, 64px)', lineHeight: 1.15, color: '#fffbf0', fontWeight: 700, margin: 0 }}>
              Three steps to protect
            </h2>
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(32px, 5vw, 64px)', lineHeight: 1.15, color: '#f59e0b', fontWeight: 700, fontStyle: 'italic', margin: 0, marginBottom: '14px' }}>
              your harvest.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{ fontFamily: F.telugu, fontSize: '18px', color: 'rgba(255,251,240,0.58)' }}>
              మీ పంటను రక్షించుకోండి
            </p>
          </Reveal>
        </div>

        {/* Step cards + connectors */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="step-card rounded-3xl cursor-default relative flex-1"
                style={{ padding: 'clamp(28px, 4vw, 48px) clamp(24px, 3.5vw, 40px)' }}
              >
                {/* Ghost step number */}
                <div
                  aria-hidden="true"
                  className="absolute"
                  style={{
                    top: '18px', right: '22px',
                    fontFamily: F.playfair,
                    fontSize: '80px',
                    fontWeight: 700,
                    color: '#f59e0b',
                    opacity: 0.1,
                    lineHeight: 1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {step.num}
                </div>

                {/* Icon */}
                <div style={{ marginBottom: '22px' }}>{step.icon}</div>

                {/* Title */}
                <h3 style={{ fontFamily: F.playfair, fontSize: '22px', fontWeight: 600, color: '#fffbf0', marginBottom: '8px' }}>
                  {step.title}
                </h3>

                {/* Telugu */}
                <p style={{ fontFamily: F.telugu, fontSize: '13px', color: '#f59e0b', marginBottom: '14px', lineHeight: 1.5 }}>
                  {step.telugu}
                </p>

                {/* Body */}
                <p style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,251,240,0.6)', lineHeight: 1.75 }}>
                  {step.body}
                </p>
              </motion.div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.45 + i * 0.15 }}
                  className="hidden md:flex flex-col items-center justify-center flex-shrink-0"
                  style={{ width: '48px' }}
                  aria-hidden="true"
                >
                  <div style={{
                    width: '100%',
                    height: '1px',
                    backgroundImage: 'repeating-linear-gradient(90deg, rgba(245,158,11,0.4) 0px, rgba(245,158,11,0.4) 5px, transparent 5px, transparent 12px)',
                    marginBottom: '4px',
                  }} />
                  <ArrowRight size={14} color="rgba(245,158,11,0.5)" strokeWidth={2} />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// RISK TYPES SECTION
// ─────────────────────────────────────────────────────────────

function _DEAD_RiskTypesSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })

  const risks = [
    {
      icon: <Thermometer size={28} strokeWidth={1.5} color="#dc2626" />,
      title: 'Heatwave',
      telugu: 'వేడిమి హెచ్చరిక',
      trigger: 'Max temp >40°C for 2+ consecutive days',
      badge: 'CRITICAL',
      badgeColor: '#dc2626',
      badgeBg: '#fef2f2',
      glow: '0 8px 30px rgba(220,38,38,0.15)',
    },
    {
      icon: <CloudOff size={28} strokeWidth={1.5} color="#d97706" />,
      title: 'Drought Risk',
      telugu: 'కరువు ప్రమాదం',
      trigger: 'Rain probability <15% over 7 days',
      badge: 'CRITICAL',
      badgeColor: '#d97706',
      badgeBg: '#fffbeb',
      glow: '0 8px 30px rgba(217,119,6,0.15)',
    },
    {
      icon: <CloudRain size={28} strokeWidth={1.5} color="#2563eb" />,
      title: 'Flood Warning',
      telugu: 'వరద హెచ్చరిక',
      trigger: '>50mm rainfall expected in 24 hours',
      badge: 'WARNING',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      glow: '0 8px 30px rgba(37,99,235,0.15)',
    },
    {
      icon: <Droplets size={28} strokeWidth={1.5} color="#059669" />,
      title: 'Soil Moisture Drop',
      telugu: 'నేల తేమ తగ్గుదల',
      trigger: 'Root zone moisture drops 30% in 48hrs',
      badge: 'WARNING',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      glow: '0 8px 30px rgba(5,150,105,0.15)',
    },
    {
      icon: <Sun size={28} strokeWidth={1.5} color="#f59e0b" />,
      title: 'Harvest Window',
      telugu: 'పంట కోత సమయం',
      trigger: '5 consecutive dry days ahead',
      badge: 'ADVISORY',
      badgeColor: '#f59e0b',
      badgeBg: '#fffbeb',
      glow: '0 8px 30px rgba(245,158,11,0.15)',
    },
    {
      icon: <Wind size={28} strokeWidth={1.5} color="#475569" />,
      title: 'Wind Damage Risk',
      telugu: 'గాలి నష్టం',
      trigger: 'High winds at critical crop growth stages',
      badge: 'WARNING',
      badgeColor: '#475569',
      badgeBg: '#f8fafc',
      glow: '0 8px 30px rgba(71,85,105,0.12)',
    },
    {
      icon: <Bug size={28} strokeWidth={1.5} color="#7c3aed" />,
      title: 'Pest Outbreak',
      telugu: 'పురుగుల ముప్పు',
      trigger: 'High humidity combined with heat spike',
      badge: 'WARNING',
      badgeColor: '#7c3aed',
      badgeBg: '#f5f3ff',
      glow: '0 8px 30px rgba(124,58,237,0.15)',
    },
    {
      icon: <Activity size={28} strokeWidth={1.5} color="#0891b2" />,
      title: 'Water Loss Rate',
      telugu: 'నీటి ఆవిరి రేటు',
      trigger: 'High ET0 — crop losing water rapidly',
      badge: 'ADVISORY',
      badgeColor: '#0891b2',
      badgeBg: '#ecfeff',
      glow: '0 8px 30px rgba(8,145,178,0.15)',
    },
  ]

  return (
    <section id="risk-alerts" className="py-24 px-6" style={{ background: '#fffbf0' }} ref={ref}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <Reveal>
            <Tag style={{ color: '#d97706' }}>[ What We Watch ]</Tag>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.15, margin: 0 }}>
              Every threat to your farm.
            </h2>
            <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 700, fontStyle: 'italic', color: '#1a1a1a', lineHeight: 1.15, margin: 0, marginBottom: '12px' }}>
              Detected early.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontFamily: F.telugu, fontSize: '16px', color: '#d97706' }}>
              మీ పొలానికి వచ్చే ప్రతి ముప్పు
            </p>
          </Reveal>
        </div>

        {/* Risk grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {risks.map((risk, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.05 + i * 0.07, ease: 'easeOut' }}
              whileHover={{ boxShadow: risk.glow }}
              className="risk-card bg-white rounded-2xl cursor-default"
              style={{
                border: '1px solid #e5e7eb',
                padding: '28px 24px',
              }}
            >
              {/* Icon + badge row */}
              <div className="flex items-start justify-between mb-4">
                {risk.icon}
                <span
                  className="text-xs font-semibold rounded-full px-3 py-1"
                  style={{
                    fontFamily: F.inter,
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                    background: risk.badgeBg,
                    color: risk.badgeColor,
                  }}
                >
                  {risk.badge}
                </span>
              </div>

              <h4 style={{ fontFamily: F.inter, fontSize: '17px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                {risk.title}
              </h4>

              <p style={{ fontFamily: F.telugu, fontSize: '12px', color: '#9ca3af', marginBottom: '10px', lineHeight: 1.5 }}>
                {risk.telugu}
              </p>

              <p style={{ fontFamily: F.inter, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                {risk.trigger}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Sample advisory card */}
        <Reveal delay={0.1}>
          <div
            className="mx-auto rounded-2xl"
            style={{
              background: '#111827',
              borderLeft: '4px solid #f59e0b',
              padding: 'clamp(24px, 4vw, 40px)',
              maxWidth: '820px',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2" style={{ marginBottom: '14px' }}>
              <Sprout size={16} color="#f59e0b" strokeWidth={2} />
              <span style={{ fontFamily: F.mono, fontSize: '11px', color: '#f59e0b', letterSpacing: '0.5px' }}>
                SAMPLE ADVISORY — Cotton Farm, Warangal
              </span>
            </div>

            {/* Risk badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', marginBottom: '20px' }}
            >
              <AlertTriangle size={14} color="#dc2626" strokeWidth={2} />
              <span style={{ fontFamily: F.inter, fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                CRITICAL — Heatwave incoming Day 3
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                'Irrigate your field before 7am tomorrow',
                'Apply mulching across full plot by Wednesday',
                'Delay fertiliser application by 5 days',
              ].map((action, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={18} color="#16a34a" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,251,240,0.85)', lineHeight: 1.5 }}>
                    Action {i + 1}: {action}
                  </span>
                </div>
              ))}
            </div>

            {/* Telugu advisory */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <p style={{ fontFamily: F.telugu, fontSize: '15px', color: 'rgba(255,251,240,0.6)', lineHeight: 1.8 }}>
                రేపు ఉదయం 7 గంటలకు ముందు నీళ్ళు పెట్టండి.<br />
                బుధవారం లోపు మల్చింగ్ వేయండి.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// HOW IT WORKS SECTION
// ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px 0px' })

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative overflow-hidden"
      style={{ minHeight: '100vh', padding: '120px clamp(24px, 5%, 80px)', backgroundColor: '#0a1a0a' }}
    >
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      >
        <source src="/how-it-works-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1 }} />

      {/* Top fade */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, transparent, #000000)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, transparent, #000000)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column - Sticky Info */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 flex flex-col items-start text-left">
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
              style={{ marginBottom: '24px' }}
            >
              <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 700, lineHeight: 1.15, color: '#fffbf0', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                Three steps
              </h2>
              <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 700, lineHeight: 1.15, color: '#fffbf0', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                to protect
              </h2>
              <h2 style={{ fontFamily: F.playfair, fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.15, color: '#f59e0b', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                your harvest.
              </h2>
            </motion.div>

            {/* Telugu subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              style={{ fontFamily: F.telugu, fontSize: 'clamp(18px, 2vw, 24px)', color: '#fffbf0', fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.4)', margin: 0, borderLeft: '3px solid #f59e0b', paddingLeft: '16px' }}
            >
              మీ పంటను రక్షించుకోండి
            </motion.p>
            
            {/* Visual Steps Tracker */}
            <div className="hidden lg:flex flex-col gap-6 mt-12 pl-1 relative">
              {[
                { n: '01', text: 'Register Farm' },
                { n: '02', text: 'Live Analysis' },
                { n: '03', text: 'Protect Crop' }
              ].map((t, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#f59e0b] transition-colors" />
                  <span className="font-mono text-[11px] text-white/40 group-hover:text-white transition-colors">{t.n} &nbsp;/&nbsp; {t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Staggered Asymmetric Cards */}
          <div className="lg:col-span-7 flex flex-col gap-12 w-full">
            
            {/* Step 1 Card - Left Aligned */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="step-card relative overflow-hidden self-start w-full max-w-lg cursor-default"
              style={{ borderRadius: '24px', padding: '44px 36px' }}
            >
              {/* Ghost number watermark */}
              <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '16px', fontFamily: F.playfair, fontSize: '100px', fontWeight: 700, color: 'rgba(255,255,255,0.025)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                01
              </div>

              {/* Icon */}
              <div style={{ marginBottom: '24px' }}>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <MapPin size={24} color="#f59e0b" strokeWidth={1.5} />
                </div>
              </div>

              {/* Telugu Header */}
              <h3 style={{ fontFamily: F.telugu, fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 600, color: '#fffbf0', marginBottom: '8px', lineHeight: 1.4 }}>
                మీ పొలం వివరాలు చెప్పండి
              </h3>

              {/* English Subtitle */}
              <p style={{ fontFamily: F.playfair, fontSize: '16px', fontStyle: 'italic', color: '#f59e0b', marginBottom: '16px', letterSpacing: '0.5px' }}>
                Tell Us Your Farm
              </p>

              {/* Body Description */}
              <p style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>
                Tell us your village name, what crop you grow, and how big your field is.
              </p>
            </motion.div>

            {/* Step 2 Card - Shifted Right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="step-card relative overflow-hidden self-end lg:mr-[-16px] w-full max-w-lg cursor-default"
              style={{ borderRadius: '24px', padding: '44px 36px' }}
            >
              {/* Ghost number watermark */}
              <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '16px', fontFamily: F.playfair, fontSize: '100px', fontWeight: 700, color: 'rgba(255,255,255,0.025)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                02
              </div>

              {/* Icon */}
              <div style={{ marginBottom: '24px' }}>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Radio size={24} color="#f59e0b" strokeWidth={1.5} />
                </div>
              </div>

              {/* Telugu Header */}
              <h3 style={{ fontFamily: F.telugu, fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 600, color: '#fffbf0', marginBottom: '8px', lineHeight: 1.4 }}>
                మేము మీ పొలాన్ని పరిశీలిస్తాము
              </h3>

              {/* English Subtitle */}
              <p style={{ fontFamily: F.playfair, fontSize: '16px', fontStyle: 'italic', color: '#f59e0b', marginBottom: '16px', letterSpacing: '0.5px' }}>
                We Check Your Field
              </p>

              {/* Body */}
              <p style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>
                We check the weather, soil, and rain forecast for your exact field location.
              </p>
            </motion.div>

            {/* Step 3 Card - Full Width Highlighted Climax */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.75, delay: 0.3, ease: 'easeOut' }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="step-card step-card-hero relative overflow-hidden w-full cursor-default"
              style={{ borderRadius: '24px', padding: '48px 40px' }}
            >
              {/* Ghost watermark */}
              <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '16px', fontFamily: F.playfair, fontSize: '110px', fontWeight: 700, color: 'rgba(245,158,11,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                03
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                <div className="flex-1">
                  {/* Icon */}
                  <div style={{ marginBottom: '24px' }}>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                      <FileText size={24} color="#f59e0b" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Telugu Header */}
                  <h3 style={{ fontFamily: F.telugu, fontSize: 'clamp(24px, 2.6vw, 32px)', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', lineHeight: 1.3 }}>
                    మీ పంటను కాపాడుకోండి
                  </h3>

                  {/* English Subtitle */}
                  <p style={{ fontFamily: F.playfair, fontSize: '18px', fontStyle: 'italic', color: '#fffbf0', marginBottom: '20px', letterSpacing: '0.5px' }}>
                    Save Your Crop
                  </p>

                  {/* Body */}
                  <p style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: 0 }}>
                    Simple steps to save your crop. What to do today, this week, and this season. In Telugu.
                  </p>
                </div>

                {/* Editorial Checklist Detail */}
                <div className="flex-shrink-0 w-full md:w-64 bg-amber-950/20 rounded-2xl p-6 border border-amber-500/10 backdrop-blur-md">
                  <span className="font-mono text-[10px] text-amber-500 tracking-wider block mb-4 uppercase">AI ADVISORY INCLUDES</span>
                  <ul className="flex flex-col gap-3 m-0 p-0 list-none">
                    {[
                      'Actionable tasks in Telugu',
                      '14-day soil moisture trends',
                      'Pest outbreak alerts',
                      'Free & accessible always'
                    ].map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs font-inter text-white/80">
                        <Check size={14} className="text-[#f59e0b] flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FOOTER CTA SECTION
// ─────────────────────────────────────────────────────────────

function FooterCTASection() {
  const ref = useRef(null)

  return (
    <section
      id="about"
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'unset',
        height: 'auto',
        padding: '80px 80px 0',
        position: 'relative',
        zIndex: 3,
        background: '#0a1a0a'
      }}
      ref={ref}
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0, opacity: 0.55 }}
      >
        <source src="/footer-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay: Reduced opacity to rgba(0,0,0,0.5) so video is visible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Top fade to smoothly transition from previous section */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, transparent, #000000)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to bottom, transparent, #000000)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center justify-center">
        
        {/* A. Closing Statement & About Info */}
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center gap-6 mb-12">
          {/* Telugu Statement (prominent) */}
          <Reveal delay={0.2}>
            <h2
              style={{
                fontFamily: F.telugu,
                fontSize: 'clamp(28px, 4.2vw, 42px)',
                color: '#fffbf0',
                fontWeight: 700,
                lineHeight: 1.5,
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                margin: '0 auto',
                maxWidth: '850px',
              }}
            >
              రైతు నమ్మకమే రేపటి ధీమా, మా సాంకేతికత, మీ శ్రమ, బంగారు పంట.
            </h2>
          </Reveal>

          {/* English Statement */}
          <Reveal delay={0.3}>
            <p
              style={{
                fontFamily: F.playfair,
                fontSize: 'clamp(18px, 2.2vw, 22px)',
                fontStyle: 'italic',
                color: '#f59e0b',
                lineHeight: 1.6,
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                margin: '0 auto',
                maxWidth: '750px',
              }}
            >
              "A farmer's trust is tomorrow's assurance. Our technology, your hard work, a golden harvest."
            </p>
          </Reveal>

          {/* About description (Simplified) */}
          <Reveal delay={0.4}>
            <p
              style={{
                fontFamily: F.inter,
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                color: 'rgba(255, 251, 240, 0.72)',
                lineHeight: 1.8,
                margin: '12px auto 0 auto',
                maxWidth: '800px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                width: '100%',
              }}
            >
              FarmAlert watches the weather for your farm every day. When danger is coming, we call you. Free. In Telugu.
            </p>
          </Reveal>
        </div>

        {/* B. Three Key Facts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl" style={{ marginBottom: '0px' }}>
          
          {/* Fact 1 - Free */}
          <Reveal delay={0.5} className="flex">
            <motion.div
              whileHover={{ y: -6, borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(20, 42, 20, 0.6)' }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '16px',
                width: '100%',
                transition: 'border-color 0.3s, background 0.3s',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={22} color="#f59e0b" strokeWidth={1.5} />
              </div>
              <div>
                <h4
                  style={{
                    fontFamily: F.telugu,
                    fontSize: '19px',
                    fontWeight: 600,
                    color: '#fffbf0',
                    marginBottom: '4px',
                  }}
                >
                  ప్రతి రైతుకూ ఉచితం
                </h4>
                <span
                  style={{
                    fontFamily: F.inter,
                    fontSize: '13px',
                    color: '#f59e0b',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Free for Every Farmer
                </span>
                <p
                  style={{
                    fontFamily: F.inter,
                    fontSize: '14px',
                    color: 'rgba(255, 251, 240, 0.6)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  No cost. No subscription. Free for every farmer in Telangana.
                </p>
              </div>
            </motion.div>
          </Reveal>

          {/* Fact 2 - Telugu */}
          <Reveal delay={0.6} className="flex">
            <motion.div
              whileHover={{ y: -6, borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(20, 42, 20, 0.6)' }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '16px',
                width: '100%',
                transition: 'border-color 0.3s, background 0.3s',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Languages size={22} color="#f59e0b" strokeWidth={1.5} />
              </div>
              <div>
                <h4
                  style={{
                    fontFamily: F.telugu,
                    fontSize: '19px',
                    fontWeight: 600,
                    color: '#fffbf0',
                    marginBottom: '4px',
                  }}
                >
                  తెలుగులో అందుబాటులో ఉంది
                </h4>
                <span
                  style={{
                    fontFamily: F.inter,
                    fontSize: '13px',
                    color: '#f59e0b',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Works in Telugu
                </span>
                <p
                  style={{
                    fontFamily: F.inter,
                    fontSize: '14px',
                    color: 'rgba(255, 251, 240, 0.6)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  All warnings and advice in Telugu. Your language first.
                </p>
              </div>
            </motion.div>
          </Reveal>

          {/* Fact 3 - Satellite */}
          <Reveal delay={0.7} className="flex">
            <motion.div
              whileHover={{ y: -6, borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(20, 42, 20, 0.6)' }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '16px',
                width: '100%',
                transition: 'border-color 0.3s, background 0.3s',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Orbit size={22} color="#f59e0b" strokeWidth={1.5} />
              </div>
              <div>
                <h4
                  style={{
                    fontFamily: F.telugu,
                    fontSize: '19px',
                    fontWeight: 600,
                    color: '#fffbf0',
                    marginBottom: '4px',
                  }}
                >
                  శ్యాటిలైట్ డేటా సహాయంతో
                </h4>
                <span
                  style={{
                    fontFamily: F.inter,
                    fontSize: '13px',
                    color: '#f59e0b',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Uses Satellite Data
                </span>
                <p
                  style={{
                    fontFamily: F.inter,
                    fontSize: '14px',
                    color: 'rgba(255, 251, 240, 0.6)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  We use satellite and weather data to watch your field every day.
                </p>
              </div>
            </motion.div>
          </Reveal>
        </div>

        {/* D. Footer Strip */}
        <div
          className="w-full text-center"
          style={{
            fontFamily: F.inter,
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.35)',
            marginTop: '24px',
            paddingTop: '0',
            marginBottom: '0',
            paddingBottom: '0',
          }}
        >
          © 2026 FarmAlert Telangana. Built for the farmers of India.
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FooterCTASection />
      </main>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/analyse" element={<AnalysePage />} />
      <Route path="/my-farms" element={<MyFarmsPage />} />
    </Routes>
  )
}
