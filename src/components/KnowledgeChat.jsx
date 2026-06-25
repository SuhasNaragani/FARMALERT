import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Maximize2, Minimize2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

const STYLES = `
  @keyframes leafPulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(8deg); }
  }
  @keyframes dotBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

const riskBadgeStyle = (risk) => {
  if (risk === 'CRITICAL') return { bg: '#fef2f2', text: '#dc2626' }
  if (risk === 'WARNING') return { bg: '#fffbeb', text: '#d97706' }
  if (risk === 'ADVISORY') return { bg: '#eff6ff', text: '#2563eb' }
  return { bg: '#f0fdf4', text: '#16a34a' }
}

const PLACEHOLDERS = [
  "Ask about PM-KISAN eligibility...",
  "How to control pests in cotton?",
  "What is PMFBY crop insurance?",
  "Best fertilizer for paddy?",
  "When to sow cotton in Telangana?",
  "How to read my soil health card?",
]

export default function KnowledgeChat({ farmContext, showNotification, onNotificationSeen }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'నమస్కారం! 🌾 Welcome to FarmAlert Assistant. I have access to verified data from official sources — PM-KISAN scheme guidelines, PMFBY crop insurance, ICAR agronomic advisories, and Telangana crop recommendations.',
      cached: false,
    },
    {
      role: 'options',
      text: '',
      cached: false,
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFarm, setAttachedFarm] = useState(null)
  const [showFarmsDropdown, setShowFarmsDropdown] = useState(false)
  const [savedFarms, setSavedFarms] = useState([])
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [proceedWithoutContext, setProceedWithoutContext] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const activeContext = farmContext || attachedFarm

  useEffect(() => {
    if (isOpen && farmContext && messages.length === 0) {
      setMessages([{
        role: 'ai',
        text: `Your farm details are loaded! Ask me anything about ${farmContext.crop} farming in ${farmContext.locationName}.`
      }])
    }
  }, [isOpen, farmContext])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (inputValue) return
    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length)
        setShowPlaceholder(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [inputValue])

  const openPanel = () => {
    onNotificationSeen?.()
    setSavedFarms(JSON.parse(localStorage.getItem('farmalert_farms') || '[]'))
    setIsOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimating(true))
    })
  }

  const closePanel = () => {
    setIsAnimating(false)
    setShowFarmsDropdown(false)
    setTimeout(() => setIsOpen(false), 350)
  }

  const togglePanel = () => {
    if (isOpen) {
      closePanel()
    } else {
      openPanel()
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)
    setShowFarmsDropdown(false)
    try {
      const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname || 'localhost'}:8000`
      const res = await fetch(`${API_URL}/api/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          crop: farmContext?.crop || attachedFarm?.crop_type || '',
          stage: farmContext?.stage || '',
          location: farmContext?.locationName || attachedFarm?.location_name || ''
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', text: data.answer, cached: data.cached }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "Sorry, I couldn't get an answer right now. Please try again in a moment."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const contextCrop = farmContext?.crop || attachedFarm?.crop_type || ''
  const contextStage = farmContext?.stage || ''
  const contextLocation = farmContext?.locationName || attachedFarm?.location_name || ''

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  }

  const letterVariants = {
    initial: {
      opacity: 0,
      filter: "blur(12px)",
      y: 10,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(12px)",
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
  }

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating Panel ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: '78px',
          left: '922px',
          right: '40px',
          bottom: '74px',
          height: 'auto',
          zIndex: 9998,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? 'scale(1) translate(0,0)' : 'scale(0.05) translate(80%, 80%)',
          transformOrigin: 'bottom right',
          pointerEvents: isAnimating ? 'all' : 'none',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 350ms ease',
        }}
      >
        {/* Ambient gradient blobs */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)',
            opacity: 0.5,
          }} />
          <div style={{
            position: 'absolute', bottom: '-80px', left: '-60px',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, #d1fae5 0%, transparent 70%)',
            opacity: 0.45,
          }} />
          <div style={{
            position: 'absolute', top: '45%', right: '-40px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, #ecfdf5 0%, transparent 70%)',
            opacity: 0.6,
          }} />
        </div>

        {/* ── Compact Header ─────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 1,
          height: '52px', padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f0fdf4', flexShrink: 0,
        }}>
          {/* Left — satellite + crop icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#1a4d2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#1a4d2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12"/>
              <path d="M12 12C12 12 8 10 8 6C8 4 10 2 12 2C14 2 16 4 16 6C16 10 12 12 12 12Z"/>
              <path d="M12 12C12 12 8 14 6 17"/>
              <path d="M12 12C12 12 16 14 18 17"/>
            </svg>
          </div>

          {/* Center — title */}
          <span style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontSize: '14px', fontWeight: 600, color: '#1a4d2e',
          }}>
            Ask FarmAlert AI
          </span>

          {/* Right — close button */}
          <button
            onClick={closePanel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: '18px', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '4px',
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* ── Messages Area ───────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 24px 16px',
          position: 'relative', zIndex: 1, marginTop: '0',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '18px' }}>
              {msg.role === 'options' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div
                    onClick={() => navigate('/analyse')}
                    style={{
                      border: '1.5px solid #1a4d2e',
                      background: '#f0fdf4',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="#1a4d2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a4d2e' }}>
                        Enter farm details
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Get personalized answers for your crop
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <>
                  <div style={{
                    fontSize: '10px', fontWeight: 600, color: '#9ca3af',
                    letterSpacing: '1px', textTransform: 'uppercase',
                    marginBottom: '4px',
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}>
                    {msg.role === 'user' ? 'ME' : 'FARMALERT AI'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={msg.role === 'user' ? {
                      background: '#f9fafb', border: '1px solid #e5e7eb',
                      borderRadius: '14px 14px 4px 14px',
                      padding: '10px 14px', fontSize: '13px', color: '#1f2937',
                      display: 'inline-block', maxWidth: '300px',
                    } : {
                      background: '#fff', border: '1px solid #d1fae5',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '12px 16px', fontSize: '13px', color: '#1f2937',
                      lineHeight: 1.6, maxWidth: '380px',
                      boxShadow: '0 1px 6px rgba(16,185,129,0.08)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                  {msg.role === 'ai' && msg.cached && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '20px', padding: '2px 8px',
                        fontSize: '10px', color: '#166534', fontWeight: 500,
                      }}>
                        ⚡ cached
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 0',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #1a4d2e',
                  animation: 'spin 2s ease-in-out infinite',
                }}/>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* ── HextaUI-style Glass Pill Bottom Bar ─────────── */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        left: '922px',
        right: '40px',
        zIndex: 9999,
        borderRadius: '100px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
        height: '52px',
        padding: '6px 6px 6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Saved farms dropdown */}
        {showFarmsDropdown && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '0', right: '0',
            marginBottom: '8px',
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
            padding: '8px', maxHeight: '200px', overflowY: 'auto',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', zIndex: 10,
          }}>
            {savedFarms.length === 0 ? (
              <p style={{
                fontSize: '12px', color: '#9ca3af',
                textAlign: 'center', padding: '16px', margin: 0,
              }}>
                No saved farms yet. Analyse a farm first.
              </p>
            ) : (
              savedFarms.map((farm, i) => {
                const badge = riskBadgeStyle(farm.last_risk)
                return (
                  <div
                    key={i}
                    onClick={() => { setAttachedFarm(farm); setShowFarmsDropdown(false) }}
                    style={{
                      padding: '10px 12px', borderRadius: '10px',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a4d2e' }}>
                        {farm.farm_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {farm.crop_type} · {farm.location_name}
                      </div>
                    </div>
                    {farm.last_risk && (
                      <span style={{
                        borderRadius: '20px', padding: '2px 8px',
                        fontSize: '10px', fontWeight: 600,
                        background: badge.bg, color: badge.text,
                        flexShrink: 0, marginLeft: '8px',
                      }}>
                        {farm.last_risk}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* a) Paperclip */}
        <button
          onClick={() => {
            setSavedFarms(JSON.parse(localStorage.getItem('farmalert_farms') || '[]'))
            setShowFarmsDropdown(v => !v)
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          aria-label="Attach saved farm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* b) Text input with animated placeholder */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              if (e.target.value.length > 0 && !isOpen) {
                setIsOpen(true)
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => setIsAnimating(true))
                })
              }
            }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#1f2937',
              position: 'relative',
              zIndex: 1,
            }}
          />
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}>
            <AnimatePresence mode="wait">
              {showPlaceholder && !inputValue && (
                <motion.span
                  key={placeholderIndex}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    zIndex: 0,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  variants={placeholderContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {PLACEHOLDERS[placeholderIndex].split('').map((char, i) => (
                    <motion.span
                      key={i}
                      variants={letterVariants}
                      style={{ display: 'inline-block' }}
                    >
                      {char === ' ' ? ' ' : char}
                    </motion.span>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* c) Send button */}
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: isLoading || !inputValue.trim() ? '#d1d5db' : '#000',
            border: 'none',
            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}
          aria-label="Send"
        >
          <Send size={16} color="#fff" />
        </button>

        {/* d) Expand / Collapse button */}
        <button
          onClick={togglePanel}
          style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: '#000', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'relative', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#3f3f46'}
          onMouseLeave={e => e.currentTarget.style.background = '#000'}
          aria-label={isOpen ? 'Collapse chat' : 'Expand chat'}
        >
          {isOpen
            ? <Minimize2 size={16} color="#fff" />
            : <Maximize2 size={16} color="#fff" />
          }
          {showNotification && (
            <span style={{
              position: 'absolute', top: '1px', right: '1px',
              width: '13px', height: '13px', borderRadius: '50%',
              background: '#ef4444', border: '2px solid #fff',
            }} />
          )}
        </button>
      </div>
    </>
  )
}
