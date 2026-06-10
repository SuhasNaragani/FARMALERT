import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  UserCircle, Sprout, Wheat, Flower2, Flame, Sun,
  MapPin, Ruler, Calendar, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const F = {
  playfair: "'Playfair Display', Georgia, serif",
  inter:    "'Inter', system-ui, sans-serif",
  telugu:   "'Noto Sans Telugu', sans-serif",
}

const CROP_META = {
  paddy:    { Icon: Wheat,   te: 'వరి' },
  cotton:   { Icon: Flower2, te: 'పత్తి' },
  soybean:  { Icon: Sprout,  te: 'సోయాబీన్' },
  chilli:   { Icon: Flame,   te: 'మిర్చి' },
  turmeric: { Icon: Sun,     te: 'పసుపు' },
}

const RISK_STYLE = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  WARNING:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  SAFE:     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  ADVISORY: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
}

function MyFarmsNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}
    >
      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>

        {/* Glass pill — desktop */}
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
            { label: 'HOME',            href: '/' },
            { label: 'HOW IT WORKS',    href: '/#how-it-works' },
            { label: 'ANALYSE MY FARM', href: '/analyse' },
            { label: 'MY FARMS',        href: '/my-farms' },
            { label: 'ABOUT',           href: '/#about' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: F.inter,
                fontSize: '13px',
                fontWeight: 500,
                color: link.href === '/my-farms' ? '#f59e0b' : '#ffffff',
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

          <motion.button
            whileHover={{ scale: 1.05 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <UserCircle size={28} color="#f59e0b" strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="md:hidden"
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginRight: '16px' }}
        >
          <div style={{ width: '24px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  height: '2px', background: '#fff', borderRadius: '1px', display: 'block',
                  transition: 'transform 0.3s, opacity 0.3s',
                  transform: menuOpen
                    ? i === 0 ? 'translateY(7px) rotate(45deg)'
                    : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)'
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
            className="md:hidden"
            style={{
              margin: '0 16px 12px',
              borderRadius: '24px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '20px 24px',
              background: 'rgba(10,26,10,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {[
              { label: 'Home',            href: '/' },
              { label: 'How It Works',    href: '/#how-it-works' },
              { label: 'Analyse My Farm', href: '/analyse' },
              { label: 'My Farms',        href: '/my-farms' },
              { label: 'About',           href: '/#about' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: F.inter, fontSize: '15px', color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

function FarmCard({ farm, onDelete, onAnalyse }) {
  const meta  = CROP_META[farm.crop_type] || { Icon: Sprout, te: '' }
  const { Icon } = meta
  const risk  = RISK_STYLE[farm.last_risk] || RISK_STYLE.ADVISORY
  const date  = farm.saved_at
    ? new Date(farm.saved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
        <Icon size={20} color="#f59e0b" strokeWidth={2} style={{ flexShrink: 0, marginTop: '3px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: F.inter, fontSize: '18px', fontWeight: 700,
            color: '#1a1a1a', margin: 0, lineHeight: 1.2, wordBreak: 'break-word',
          }}>
            {farm.name}
          </p>
          <p style={{ fontFamily: F.telugu, fontSize: '13px', color: '#f59e0b', margin: '3px 0 0' }}>
            {meta.te}
          </p>
        </div>
        <span style={{
          flexShrink: 0,
          fontFamily: F.inter, fontSize: '11px', fontWeight: 600,
          background: risk.bg, color: risk.text,
          border: `1px solid ${risk.border}`,
          borderRadius: '100px', padding: '4px 10px',
          whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {farm.last_risk || 'ADVISORY'}
        </span>
      </div>

      {/* Meta rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <MapPin size={14} color="#999" strokeWidth={2} />
          <span style={{ fontFamily: F.inter, fontSize: '13px', color: '#666' }}>{farm.location_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Ruler size={14} color="#999" strokeWidth={2} />
          <span style={{ fontFamily: F.inter, fontSize: '13px', color: '#666' }}>{farm.plot_size_display || `${farm.plot_size} acres`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Calendar size={14} color="#999" strokeWidth={2} />
          <span style={{ fontFamily: F.inter, fontSize: '13px', color: '#666' }}>Saved {date}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          onClick={() => onAnalyse(farm)}
          style={{
            flex: 1,
            background: '#f59e0b',
            color: '#0a1a0a',
            fontFamily: F.inter, fontSize: '13px', fontWeight: 600,
            border: 'none', borderRadius: '100px',
            padding: '8px 16px', cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#d97706' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f59e0b' }}
        >
          Analyse →
        </button>
        <button
          onClick={() => onDelete(farm.id)}
          style={{
            background: 'transparent',
            border: '1px solid #e5e7eb',
            color: '#999',
            fontFamily: F.inter, fontSize: '13px',
            borderRadius: '100px', padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#999' }}
        >
          <Trash2 size={13} strokeWidth={2} /> Delete
        </button>
      </div>
    </div>
  )
}

export default function MyFarmsPage() {
  const [farms, setFarms] = useState(() =>
    JSON.parse(localStorage.getItem('farmalert_farms') || '[]')
  )
  const navigate = useNavigate()

  const deleteFarm = id => {
    const updated = farms.filter(f => f.id !== id)
    setFarms(updated)
    localStorage.setItem('farmalert_farms', JSON.stringify(updated))
  }

  const analyseFarm = farm => {
    navigate('/analyse', { state: { autoAnalyse: farm } })
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative', overflowX: 'hidden' }}>

      {/* Fixed background */}
      <img
        src="/form-bg.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1 }}
      />

      <MyFarmsNavbar />

      <div style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '80px' }}>

        {/* Page title */}
        <div style={{ marginLeft: 'clamp(16px, 5vw, 48px)', marginBottom: '40px' }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: F.playfair, fontSize: '48px', fontWeight: 700,
              color: '#fffbf0', margin: 0, lineHeight: 1.15,
            }}
          >
            My Farms
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ fontFamily: F.telugu, fontSize: '18px', color: '#f59e0b', margin: '6px 0 0' }}
          >
            నా పొలాలు
          </motion.p>
        </div>

        {farms.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: '40vh', gap: '16px',
              textAlign: 'center', padding: '0 24px',
            }}
          >
            <Sprout size={48} color="#f59e0b" strokeWidth={1.5} />
            <div>
              <p style={{
                fontFamily: F.inter, fontSize: '20px', fontWeight: 600,
                color: 'rgba(255,255,255,0.85)', margin: '0 0 4px',
              }}>
                No farms saved yet
              </p>
              <p style={{ fontFamily: F.telugu, fontSize: '16px', color: '#f59e0b', margin: '0 0 10px' }}>
                నీ పొలాలు లేవు
              </p>
              <p style={{
                fontFamily: F.inter, fontSize: '16px',
                color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '400px',
              }}>
                Click 'Save Farm' after analysing to save your farms here.
              </p>
            </div>
          </motion.div>
        ) : (
          /* Cards grid */
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: '20px', padding: '0 clamp(16px, 5vw, 48px)' }}
          >
            <AnimatePresence>
              {farms.map((farm, i) => (
                <motion.div
                  key={farm.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                >
                  <FarmCard farm={farm} onDelete={deleteFarm} onAnalyse={analyseFarm} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
