// -*- coding: utf-8 -*-
import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  MapPin, UserCircle, Loader2, Wheat, Flower2, Circle, Flame, Sun,
  ArrowLeft, Bookmark, Ruler, Thermometer, CloudRain, CloudOff, Droplets, Wind, Calendar,
  CheckCircle, AlertTriangle, Layers, Satellite, Brain, Shield, Sprout,
  Zap, ShieldCheck, Leaf, X as XIcon, Cloud,
  TrendingUp, TrendingDown, Clock, ArrowDown
} from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


// ─── Font helpers ────────────────────────────────────────────
const F = {
  playfair: "'Playfair Display', Georgia, serif",
  inter:    "'Inter', system-ui, sans-serif",
  telugu:   "'Noto Sans Telugu', sans-serif",
  dmSans:   "'DM Sans', system-ui, sans-serif",
  dmMono:   "'DM Mono', monospace",
}

// ─── Crops ───────────────────────────────────────────────────
const CROPS = [
  { id: 'paddy',    en: 'Paddy',      te: 'వరి',      img: '/crops/paddy-3d.png',    gradient: 'linear-gradient(135deg, #4a7c2f, #2d5a1b)', Icon: Wheat,   iconColor: '#ffffff' },
  { id: 'cotton',   en: 'Cotton',     te: 'పత్తి',     img: '/crops/cotton-3d.png',   gradient: 'linear-gradient(135deg, #e8e8e8, #c8c8c8)', Icon: Flower2, iconColor: '#555555' },
  { id: 'soybean',  en: 'Soybean',    te: 'సోయాబీన్', img: '/crops/soybean-3d.png',  gradient: 'linear-gradient(135deg, #8b7355, #5a4a2d)', Icon: Circle,  iconColor: '#ffffff' },
  { id: 'chilli',   en: 'Red Chilli', te: 'మిర్చి',    img: '/crops/chilli-3d.png',   gradient: 'linear-gradient(135deg, #cc2200, #8b0000)', Icon: Flame,   iconColor: '#ffffff' },
  { id: 'turmeric', en: 'Turmeric',   te: 'పసుపు',     img: '/crops/turmeric-3d.png', gradient: 'linear-gradient(135deg, #d4a017, #b8860b)', Icon: Sun,     iconColor: '#ffffff' },
]

// ─── Stage age display map ────────────────────────────────────
const STAGE_AGE_DISPLAY = {
  paddy: {
    nursery:       { label: 'Nursery',             age: '0–21 days' },
    transplanting: { label: 'Transplanting',        age: '21–30 days' },
    tillering:     { label: 'Tillering',            age: '30–60 days' },
    flowering:     { label: 'Flowering',            age: '60–90 days' },
    grain_filling: { label: 'Grain Filling',        age: '90–110 days' },
    harvest:       { label: 'Harvest',              age: '110–130 days' },
  },
  cotton: {
    germination:    { label: 'Germination',         age: '0–15 days' },
    vegetative:     { label: 'Vegetative',          age: '15–45 days' },
    flowering:      { label: 'Flowering',           age: '45–75 days' },
    boll_formation: { label: 'Boll Formation',      age: '75–110 days' },
    harvest:        { label: 'Harvest',             age: '110–180 days' },
  },
  chilli: {
    seedling:  { label: 'Seedling',                 age: '0–30 days' },
    vegetative: { label: 'Vegetative',              age: '30–60 days' },
    flowering:  { label: 'Flowering',              age: '60–90 days' },
    fruiting:   { label: 'Fruiting',               age: '90–120 days' },
    harvest:    { label: 'Harvest',                age: '120–150 days' },
  },
  soybean: {
    germination: { label: 'Germination',            age: '0–10 days' },
    vegetative:  { label: 'Vegetative',             age: '10–35 days' },
    flowering:   { label: 'Flowering',              age: '35–55 days' },
    pod_filling: { label: 'Pod Filling',            age: '55–80 days' },
    harvest:     { label: 'Harvest',               age: '80–100 days' },
  },
  turmeric: {
    planting:    { label: 'Planting',              age: '0–30 days' },
    vegetative:  { label: 'Vegetative',            age: '30–120 days' },
    rhizome_dev: { label: 'Rhizome Development',   age: '120–210 days' },
    harvest:     { label: 'Harvest',              age: '210–270 days' },
  },
}

// ─── Crop stages ─────────────────────────────────────────────
const CROP_STAGES = {
  paddy: [
    { id: 'nursery',       en: 'Nursery',              te: 'నారుమడి' },
    { id: 'transplanting', en: 'Transplanting',         te: 'నాటడం' },
    { id: 'tillering',     en: 'Tillering',             te: 'పిలకలు వేయడం' },
    { id: 'flowering',     en: 'Flowering',             te: 'పూత దశ' },
    { id: 'grain_filling', en: 'Grain Filling',         te: 'గింజలు నిండే దశ' },
    { id: 'harvest',       en: 'Harvest',               te: 'కోత దశ' },
  ],
  cotton: [
    { id: 'germination',   en: 'Germination',           te: 'మొలకెత్తడం' },
    { id: 'vegetative',    en: 'Vegetative',            te: 'పెరుగుదల దశ' },
    { id: 'flowering',     en: 'Flowering',             te: 'పూత దశ' },
    { id: 'boll_formation',en: 'Boll Formation',        te: 'గూళ్ళు తయారు దశ' },
    { id: 'harvest',       en: 'Harvest',               te: 'కోత దశ' },
  ],
  chilli: [
    { id: 'seedling',      en: 'Seedling',              te: 'మొక్క దశ' },
    { id: 'vegetative',    en: 'Vegetative',            te: 'పెరుగుదల దశ' },
    { id: 'flowering',     en: 'Flowering',             te: 'పూత దశ' },
    { id: 'fruiting',      en: 'Fruiting',              te: 'కాయలు తయారు దశ' },
    { id: 'harvest',       en: 'Harvest',               te: 'కోత దశ' },
  ],
  soybean: [
    { id: 'germination',   en: 'Germination',           te: 'మొలకెత్తడం' },
    { id: 'vegetative',    en: 'Vegetative',            te: 'పెరుగుదల దశ' },
    { id: 'flowering',     en: 'Flowering',             te: 'పూత దశ' },
    { id: 'pod_filling',   en: 'Pod Filling',           te: 'పొట్లాలు నిండే దశ' },
    { id: 'harvest',       en: 'Harvest',               te: 'కోత దశ' },
  ],
  turmeric: [
    { id: 'planting',      en: 'Planting',              te: 'నాటడం' },
    { id: 'vegetative',    en: 'Vegetative',            te: 'పెరుగుదల దశ' },
    { id: 'rhizome_dev',   en: 'Rhizome Development',  te: 'దుంప అభివృద్ధి దశ' },
    { id: 'harvest',       en: 'Harvest',               te: 'కోత దశ' },
  ],
}

// ─── Soil options ─────────────────────────────────────────────
const SOIL_OPTIONS = [
  { id: 'black_cotton', en: 'Black Cotton Soil', te: 'నల్ల నేల',    desc: 'Most common in Warangal, Karimnagar, Nizamabad districts', char: 'High water retention, cracks when dry' },
  { id: 'red_sandy',    en: 'Red Sandy Soil',    te: 'ఎర్ర నేల',    desc: 'Found in Nalgonda, Mahbubnagar, Ranga Reddy',            char: 'Drains fast, needs frequent irrigation' },
  { id: 'loamy',        en: 'Loamy Soil',        te: 'గరప నేల',     desc: 'Mixed districts, good agricultural land',                char: 'Best for most crops, good water retention' },
  { id: 'clay',         en: 'Clay Soil',         te: 'బంక నేల',     desc: 'Low lying areas, Krishna and Godavari deltas',           char: 'Heavy, high moisture, poor drainage' },
  { id: 'sandy',        en: 'Sandy Soil',        te: 'ఇసుక నేల',    desc: 'Dry regions, Mahabubnagar district',                    char: 'Very fast drainage, low fertility' },
  { id: 'laterite',     en: 'Laterite Soil',     te: 'లాటరైట్ నేల', desc: 'Hilly areas, Adilabad district',                        char: 'Iron rich, moderate fertility' },
  { id: 'alluvial',     en: 'Alluvial Soil',     te: 'రేగడ నేల',    desc: 'River banks, Godavari and Krishna basins',              char: 'Very fertile, excellent for paddy' },
  { id: 'saline',       en: 'Saline Soil',       te: 'ఉప్పు నేల',   desc: 'Coastal areas, affected irrigation zones',              char: 'High salt content, needs special treatment' },
]
const SOIL_QUICK = SOIL_OPTIONS.filter(s =>
  ['black_cotton', 'red_sandy', 'loamy', 'alluvial'].includes(s.id)
)

// ─── Custom green pin for Leaflet ─────────────────────────────
const greenPin = L.divIcon({
  className: '',
  html: `<div style="
    width: 16px; height: 16px;
    background: #16a34a;
    border: 2.5px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.35), 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// ─── Map: fly to location on GPS / click ──────────────────────
function MapController({ location }) {
  const map = useMap()
  const prev = useRef(null)
  useEffect(() => {
    if (
      location &&
      (prev.current?.lat !== location.lat || prev.current?.lng !== location.lng)
    ) {
      map.flyTo([location.lat, location.lng], 14, { duration: 1 })
      prev.current = location
    }
  }, [location, map])
  return null
}

// ─── Map: capture click events ────────────────────────────────
function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// ─── Navbar (same glass pill, HOME links to /) ───────────────
const MIN_LOADING_MS = 6000

function LoadingScreen({ isComplete, isFinishing }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isFinishing ? 0 : 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{
        minHeight: '100vh',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px 24px 48px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '280px',
            height: '280px',
            objectFit: 'contain'
          }}
        >
          <source src="/farmer-loading.mp4" type="video/mp4" />
        </video>

        <div style={{
          width: '320px',
          maxWidth: '80vw',
          height: '6px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '100px',
          marginTop: '32px',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: isComplete ? '100%' : '95%' }}
            transition={{ duration: isComplete ? 0.25 : 6, ease: 'linear' }}
            style={{
              height: '100%',
              background: 'linear-gradient(to right, #16a34a, #22c55e)',
              borderRadius: '100px',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}
function Navbar({ onBack, showBack, onSaveFarm }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const pillBtnStyle = {
    background: 'rgba(10, 26, 10, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '100px',
    padding: '8px 20px',
    color: 'rgba(255,255,255,0.9)',
    cursor: 'pointer',
    fontFamily: F.inter,
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    outline: 'none',
    transition: 'background 0.2s',
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}
    >
      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: showBack ? 'space-between' : 'flex-end' }}>

        {showBack && (
          <div style={{ marginLeft: 'clamp(16px, 3vw, 40px)', display: 'flex', gap: '8px' }}>
            <button
              onClick={onBack}
              style={pillBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10, 26, 10, 0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10, 26, 10, 0.55)' }}
            >
              <ArrowLeft size={14} strokeWidth={1.5} /> Back to Form
            </button>
            <button
              onClick={onSaveFarm}
              style={pillBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10, 26, 10, 0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10, 26, 10, 0.55)' }}
            >
              <Bookmark size={14} strokeWidth={1.5} /> Save Farm
            </button>
          </div>
        )}

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
                color: link.href === '/analyse' ? '#f59e0b' : '#ffffff',
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

// ─── Label component ──────────────────────────────────────────
function FieldLabel({ en, te }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <span style={{ fontFamily: F.inter, fontSize: '14px', color: '#f59e0b', fontWeight: 500 }}>
        {en}
      </span>
      <span
        style={{
          fontFamily: F.telugu,
          fontSize: '12px',
          color: 'rgba(255,255,255,0.45)',
          marginLeft: '10px',
        }}
      >
        {te}
      </span>
    </div>
  )
}

// ─── Analyse Page ─────────────────────────────────────────────
export default function AnalysePage({ onAnalysisComplete }) {
  const [location, setLocation]       = useState(null)
  const [locationName, setLocationName] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const [locationSearchFocused, setLocationSearchFocused] = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [selectedCrop, setSelectedCrop] = useState(null)
  const [plotSize, setPlotSize]       = useState('')
  const [language, setLanguage]       = useState('telugu')
  const [errors, setErrors]           = useState({})
  const [shaking, setShaking]         = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [loadingFinishing, setLoadingFinishing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [savedToast, setSavedToast]   = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [farmNameInput, setFarmNameInput] = useState('')
  const [farmNameError, setFarmNameError] = useState('')
  const [cropStage, setCropStage]         = useState('')
  const [soilType, setSoilType]           = useState('')
  const [showSoilDropdown, setShowSoilDropdown] = useState(false)
  const [plotSizeUnit, setPlotSizeUnit]   = useState('acres')

  const routeLocation = useLocation()
  const autoAnalysed      = useRef(false)
  const farmNameInputRef  = useRef(null)
  const loadingStartedAt  = useRef(0)
  const soilWrapperRef    = useRef(null)
  const locationSearchRef = useRef(null)
  const skipNextLocationSearch = useRef(false)

  useEffect(() => {
    const handleOutsideClick = e => {
      if (soilWrapperRef.current && !soilWrapperRef.current.contains(e.target)) {
        setShowSoilDropdown(false)
      }
      if (locationSearchRef.current && !locationSearchRef.current.contains(e.target)) {
        setLocationSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (skipNextLocationSearch.current) {
      skipNextLocationSearch.current = false
      return
    }

    const query = locationQuery.trim()
    if (query.length < 3) {
      setLocationSuggestions([])
      setLocationSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const debounceTimer = setTimeout(async () => {
      setLocationSearchLoading(true)
      try {
        const params = new URLSearchParams({
          q: query,
          format: 'json',
          limit: '5',
          countrycodes: 'in',
          addressdetails: '1',
        })
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }
        )
        if (!response.ok) throw new Error('Location search failed')
        setLocationSuggestions(await response.json())
      } catch (error) {
        if (error.name !== 'AbortError') setLocationSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLocationSearchLoading(false)
      }
    }, 500)

    return () => {
      clearTimeout(debounceTimer)
      controller.abort()
    }
  }, [locationQuery])

  const beginLoading = () => {
    loadingStartedAt.current = Date.now()
    setLoadingComplete(false)
    setLoadingFinishing(false)
    setIsSubmitting(true)
  }

  const completeLoadingWithResults = data => {
    setAnalysisData(data)
    if (onAnalysisComplete) {
      onAnalysisComplete({
        crop: data.selected_crop || selectedCrop,
        stage: cropStage || "",
        soil: soilType || "",
        locationName: data.location_name || locationName,
        lat: data.location?.lat || location?.lat,
        lng: data.location?.lng || location?.lng,
      })
    }
    setLoadingComplete(true)
    const elapsed = Date.now() - loadingStartedAt.current
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed)
    setTimeout(() => {
      setLoadingFinishing(true)
      setTimeout(() => {
        setIsSubmitting(false)
        window.scrollTo(0, 0)
        setShowResults(true)
      }, 450)
    }, remaining)
  }

  useEffect(() => {
    const farm = routeLocation.state?.autoAnalyse
    if (farm && !autoAnalysed.current) {
      autoAnalysed.current = true
      beginLoading()
      const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname || 'localhost'}:8000`
      fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: farm.latitude,
          lng: farm.longitude,
          crop_type: farm.crop_type,
          plot_size: parseFloat(farm.plot_size),
          language: 'telugu',
          location_name: `${String(farm.crop_type).charAt(0).toUpperCase() + String(farm.crop_type).slice(1)} Farm`
        })
      })
        .then(r => r.json())
        .then(data => {
          completeLoadingWithResults(data)
        })
        .catch(() => {
          setErrors({ api: 'Failed to connect to backend server. Please make sure the backend is running.' })
          setIsSubmitting(false)
          setLoadingComplete(false)
          setLoadingFinishing(false)
        })
    }
  }, [])

  useEffect(() => {
    if (showSaveModal) {
      setTimeout(() => farmNameInputRef.current?.focus(), 50)
    }
  }, [showSaveModal])

  const triggerShake = keys => {
    const s = {}
    keys.forEach(k => (s[k] = true))
    setShaking(s)
    setTimeout(() => setShaking({}), 500)
  }

  const handleSaveFarm = () => {
    if (!analysisData) return
    const suggested = [analysisData.location_name, analysisData.selected_crop]
      .filter(Boolean).join(' - ')
    setFarmNameInput(suggested)
    setFarmNameError('')
    setShowSaveModal(true)
  }

  const handleSaveFarmConfirm = () => {
    const name = farmNameInput.trim()
    if (!name) {
      setFarmNameError('Please enter a farm name')
      return
    }
    const overallRisk = analysisData.risks?.some(r => r.severity === 'CRITICAL') ? 'CRITICAL'
      : analysisData.risks?.some(r => r.severity === 'WARNING')  ? 'WARNING'
      : analysisData.risks?.some(r => r.severity === 'ADVISORY') ? 'ADVISORY'
      : 'SAFE'
    const savedUnitTeLabels = { guntas: 'గుంటలు', cents: 'సెంట్లు', hectares: 'హెక్టార్లు' }
    const savedUnit = plotSizeUnit || 'acres'
    const savedPlotDisplay = (savedUnit !== 'acres' && plotSize)
      ? `${plotSize} ${savedUnitTeLabels[savedUnit]} (${analysisData.plot_size} acres)`
      : `${analysisData.plot_size} acres`
    const newFarm = {
      id: Date.now(),
      name,
      location_name: analysisData.location_name || '',
      crop_type: analysisData.selected_crop || '',
      plot_size: analysisData.plot_size || 0,
      plot_size_acres: analysisData.plot_size || 0,
      plot_size_display: savedPlotDisplay,
      latitude: analysisData.location?.lat,
      longitude: analysisData.location?.lng,
      last_risk: overallRisk,
      saved_at: new Date().toISOString()
    }
    const existing = JSON.parse(localStorage.getItem('farmalert_farms') || '[]')
    const dupIdx = existing.findIndex(
      f => f.latitude === newFarm.latitude && f.longitude === newFarm.longitude
    )
    if (dupIdx >= 0) {
      existing[dupIdx] = { ...newFarm, id: existing[dupIdx].id }
    } else {
      existing.push(newFarm)
    }
    localStorage.setItem('farmalert_farms', JSON.stringify(existing))
    setShowSaveModal(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const handleGPS = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        setLocationName('')
        setLocationQuery('')
        setLocationSuggestions([])
        setErrors(prev => ({ ...prev, location: null }))
        setGpsLoading(false)
      },
      () => setGpsLoading(false)
    )
  }

  const handleMapPick = loc => {
    setLocation(loc)
    setLocationName('')
    setLocationQuery('')
    setLocationSuggestions([])
    setErrors(prev => ({ ...prev, location: null }))
  }

  const getSuggestionDetails = suggestion => {
    const address = suggestion.address || {}
    const placeName = address.village || address.town || address.city || address.hamlet ||
      address.suburb || suggestion.name || suggestion.display_name.split(',')[0]
    const district = address.state_district || address.district || address.county
    const region = [district, address.state].filter(Boolean)
    return {
      placeName,
      region: [...new Set(region)].join(', '),
      fullName: [placeName, district, address.state, address.country]
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .join(', '),
    }
  }

  const handleLocationSelect = suggestion => {
    const { placeName, fullName } = getSuggestionDetails(suggestion)
    setLocation({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    })
    setLocationName(fullName)
    skipNextLocationSearch.current = true
    setLocationQuery(placeName)
    setLocationSuggestions([])
    setErrors(prev => ({ ...prev, location: null }))
  }

  const handleSubmit = async () => {
    const missing = []
    const newErrors = {}
    if (!location)    { missing.push('location');  newErrors.location = 'This field is required' }
    if (!selectedCrop){ missing.push('crop');       newErrors.crop     = 'This field is required' }
    if (!plotSize)    { missing.push('plotSize');   newErrors.plotSize = 'This field is required' }

    if (missing.length > 0) {
      setErrors(newErrors)
      triggerShake(missing)
      return
    }

    const rawSize = parseFloat(plotSize)
    const unitConversions = { acres: 1, guntas: 1 / 40, cents: 1 / 100, hectares: 2.471 }
    const plotSizeAcres = rawSize * (unitConversions[plotSizeUnit] ?? 1)

    const formData = {
      lat: location.lat,
      lng: location.lng,
      crop_type: selectedCrop,
      plot_size: parseFloat(plotSizeAcres.toFixed(4)),
      plot_size_original: rawSize,
      plot_size_unit: plotSizeUnit,
      language: language,
      location_name: locationName || `${selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)} Farm`,
      crop_stage: cropStage || null,
      soil_type: soilType || null,
    }
    console.log("Form submitted:", formData)
    const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname || 'localhost'}:8000`
    console.log("Calling API:", `${API_URL}/api/analyze`)

    beginLoading()
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API response:", data)
      console.log(JSON.stringify(data, null, 2))
      console.log("Now displaying real data for:", data.location_name)
      completeLoadingWithResults(data);
    } catch (err) {
      console.error("API call failed:", err);
      setErrors({ api: "Failed to connect to backend server. Please make sure the backend is running." });
      setIsSubmitting(false);
      setLoadingComplete(false);
      setLoadingFinishing(false);
    }
  }


  // ── Stagger delays for form sections ─────────────────────────
  const sectionDelays = [0.5, 0.6, 0.7, 0.75]

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1200 0%, #2d1e00 30%, #1a0f00 60%, #0a1a0a 100%)',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <Navbar showBack={showResults} onBack={() => setShowResults(false)} onSaveFarm={handleSaveFarm} />

      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'rgba(22,163,74,0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '100px',
              padding: '12px 24px',
              color: '#ffffff',
              fontFamily: F.inter,
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <CheckCircle size={16} color="#ffffff" strokeWidth={2} />
            <span>Farm saved successfully!</span>
            <span style={{ fontFamily: F.telugu, fontSize: '13px', opacity: 0.9 }}>పొలం సేవ్ అయింది!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Farm name modal */}
      {showSaveModal && (
        <div
          onClick={() => setShowSaveModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveFarmConfirm()
              if (e.key === 'Escape') setShowSaveModal(false)
            }}
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: '90%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontFamily: F.playfair, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
              Name Your Farm
            </p>
            <p style={{ fontFamily: F.telugu, fontSize: 14, color: '#999', margin: '0 0 12px' }}>
              మీ పొలానికి పేరు పెట్టండి
            </p>
            {analysisData && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {analysisData.selected_crop && (
                  <span style={{ fontFamily: F.inter, fontSize: 12, color: '#666', background: '#f3f4f6', borderRadius: 100, padding: '3px 10px' }}>
                    {analysisData.selected_crop.charAt(0).toUpperCase() + analysisData.selected_crop.slice(1)}
                  </span>
                )}
                <span style={{ fontFamily: F.inter, fontSize: 12, color: '#666', background: '#f3f4f6', borderRadius: 100, padding: '3px 10px' }}>
                  {(() => {
                    const teLabels = { guntas: 'గుంటలు', cents: 'సెంట్లు', hectares: 'హెక్టార్లు' }
                    const u = plotSizeUnit || 'acres'
                    return (u !== 'acres' && plotSize)
                      ? `${plotSize} ${teLabels[u]} (${analysisData.plot_size} acres)`
                      : `${analysisData.plot_size} acres`
                  })()}
                </span>
              </div>
            )}
            <input
              ref={farmNameInputRef}
              type="text"
              value={farmNameInput}
              onChange={e => { setFarmNameInput(e.target.value); if (farmNameError) setFarmNameError('') }}
              placeholder="e.g. My Paddy Farm, Warangal"
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                background: '#f9fafb',
                border: `1px solid ${farmNameError ? '#dc2626' : '#e5e7eb'}`,
                borderRadius: 12,
                padding: '14px 16px',
                fontFamily: F.inter,
                fontSize: 15,
                color: '#1a1a1a',
                outline: 'none',
                marginBottom: farmNameError ? 6 : 24,
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => { if (!farmNameError) e.target.style.borderColor = '#f59e0b' }}
              onBlur={e => { if (!farmNameError) e.target.style.borderColor = '#e5e7eb' }}
            />
            {farmNameError && (
              <p style={{ fontFamily: F.inter, fontSize: 12, color: '#dc2626', margin: '0 0 20px' }}>
                {farmNameError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  color: '#666',
                  borderRadius: 100,
                  padding: '10px 24px',
                  fontFamily: F.inter,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFarmConfirm}
                style={{
                  background: '#f59e0b',
                  border: 'none',
                  color: '#0a1a0a',
                  borderRadius: 100,
                  padding: '10px 24px',
                  fontFamily: F.inter,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {!showResults ? (
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 10 }}>
          <img
            src="/form-bg.jpg"
            alt=""
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              zIndex: 0,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 1,
            }}
          />

          {/* ── Two-column layout ─────────────────────────────── */}
          {isSubmitting ? (
            <LoadingScreen isComplete={loadingComplete} isFinishing={loadingFinishing} />
          ) : (
          <div
            className="flex flex-col lg:flex-row"
            style={{ position: 'relative', zIndex: 10, minHeight: '100vh' }}
          >
            {/* ── LEFT COLUMN (55%) ──────────────────────────── */}
            <div
              className="w-full lg:w-[55%]"
              style={{ paddingTop: '80px', paddingBottom: '80px', paddingLeft: 'clamp(24px, 5vw, 48px)', paddingRight: '24px' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '16px', marginTop: '0px' }}
              >
                <span style={{
                  fontFamily: F.playfair,
                  fontSize: '28px',
                  fontWeight: 500,
                  color: '#fffbf0',
                  display: 'block',
                  lineHeight: 1.2,
                }}>
                  Tell us about your farm
                </span>
                <span style={{
                  fontFamily: F.telugu,
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.65)',
                  display: 'block',
                  marginTop: '6px',
                }}>
                  మీ పొలం వివరాలు నమోదు చేయండి
                </span>
              </motion.div>

              {/* Form fields — glass card */}
              <div style={{
                maxWidth: '800px',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: 'clamp(28px, 5vw, 48px)',
              }}>

            {/* ── INPUT 1: LOCATION ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: sectionDelays[0], ease: 'easeOut' }}
              className={shaking.location ? 'fa-shake-anim' : ''}
              style={{ marginBottom: '40px' }}
            >
              <FieldLabel en="Your Farm Location" te="మీ పొలం స్థానం" />

              {/* Address search */}
              <div ref={locationSearchRef} style={{ position: 'relative', width: '100%' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={e => setLocationQuery(e.target.value)}
                    onFocus={() => setLocationSearchFocused(true)}
                    onBlur={() => setLocationSearchFocused(false)}
                    placeholder={language === 'telugu'
                      ? 'గ్రామం లేదా పట్టణం వెతకండి...'
                      : 'Search village, town or address...'}
                    autoComplete="off"
                    style={{
                      boxSizing: 'border-box',
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${locationSearchFocused ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '12px',
                      padding: locationSearchLoading ? '14px 44px 14px 16px' : '14px 16px',
                      color: '#fffbf0',
                      fontFamily: F.inter,
                      fontSize: '14px',
                      outline: 'none',
                      marginBottom: '12px',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  {locationSearchLoading && (
                    <Loader2
                      size={16}
                      color="#f59e0b"
                      className="fa-location-search-spinner"
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>

                {locationSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% - 8px)',
                    left: 0,
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    zIndex: 100,
                  }}>
                    {locationSuggestions.map(suggestion => {
                      const details = getSuggestionDetails(suggestion)
                      return (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          onClick={() => handleLocationSelect(suggestion)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 16px',
                            background: '#ffffff',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#ffffff' }}
                        >
                          <MapPin size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ minWidth: 0 }}>
                            <span style={{
                              display: 'block',
                              fontFamily: F.inter,
                              fontSize: '13px',
                              color: '#1a1a1a',
                            }}>
                              {details.placeName}
                            </span>
                            {details.region && (
                              <span style={{
                                display: 'block',
                                marginTop: '2px',
                                fontFamily: F.inter,
                                fontSize: '11px',
                                color: '#999',
                              }}>
                                {details.region}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleGPS}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(245,158,11,0.15)',
                  border: errors.location
                    ? '1px solid #dc2626'
                    : '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b',
                  fontFamily: F.inter,
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '100px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)' }}
              >
                <MapPin size={16} strokeWidth={2} />
                {gpsLoading ? 'Getting location...' : 'Use My Location'}
              </button>

              {/* Coordinates display */}
              {location && (
                <p
                  style={{
                    fontFamily: F.inter,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.45)',
                    marginBottom: '8px',
                  }}
                >
                  {locationName
                    ? `📍 ${locationName}`
                    : `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                </p>
              )}

              <div style={{ marginBottom: '8px' }}>
                <p style={{
                  fontFamily: F.inter,
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)',
                  margin: 0,
                }}>
                  Find your field on the map and click on it
                </p>
                <p style={{
                  fontFamily: F.telugu,
                  fontSize: '12px',
                  color: '#f59e0b',
                  margin: 0,
                }}>
                  మీ పొలాన్ని మ్యాప్‌లో చూసి క్లిక్ చేయండి
                </p>
              </div>

              {/* Leaflet Map */}
              <div
                style={{
                  height: '200px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: errors.location
                    ? '1px solid #dc2626'
                    : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <MapContainer
                  center={[17.9689, 79.5941]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles © Esri"
                    maxZoom={19}
                  />
                  <MapClickHandler onPick={handleMapPick} />
                  <MapController location={location} />
                  {location && (
                    <Marker position={[location.lat, location.lng]} icon={greenPin} />
                  )}
                </MapContainer>
              </div>

              {errors.location && (
                <p style={{ fontFamily: F.inter, fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                  {errors.location}
                </p>
              )}
            </motion.div>

            {/* ── INPUT 2: CROP ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: sectionDelays[1], ease: 'easeOut' }}
              className={shaking.crop ? 'fa-shake-anim' : ''}
              style={{ marginBottom: '40px' }}
            >
              <FieldLabel en="Select Your Crop" te="మీ పంట ఎంచుకోండి" />

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {CROPS.map(crop => {
                  const active = selectedCrop === crop.id
                  return (
                    <button
                      key={crop.id}
                      onClick={() => {
                        setSelectedCrop(crop.id)
                        setCropStage('')
                        setErrors(prev => ({ ...prev, crop: null }))
                      }}
                      style={{
                        flex: '1 1 calc(20% - 10px)',
                        minWidth: '120px',
                        background: active ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                        border: active
                          ? '2px solid #f59e0b'
                          : errors.crop
                          ? '2px solid #dc2626'
                          : '2px solid transparent',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        transform: active ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <img
                        src={crop.img}
                        alt={crop.en}
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'contain',
                          background: 'transparent',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: F.inter, fontSize: '14px', color: crop.textDark ? '#1a1a1a' : '#fffbf0' }}>
                        {crop.en}
                      </span>
                      <span style={{ fontFamily: F.telugu, fontSize: '13px', color: crop.textDark ? '#1a1a1a' : '#f59e0b' }}>
                        {crop.te}
                      </span>
                    </button>
                  )
                })}
              </div>

              {errors.crop && (
                <p style={{ fontFamily: F.inter, fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
                  {errors.crop}
                </p>
              )}
            </motion.div>

            {/* ── INPUT 3: CROP STAGE ──────────────────────── */}
            <AnimatePresence mode="wait">
              {selectedCrop && (
                <motion.div
                  key={`stage-${selectedCrop}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ marginBottom: '40px' }}
                >
                  <FieldLabel en="Crop Stage" te="పంట దశ" />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(CROP_STAGES[selectedCrop] || []).map(stage => {
                      const active = cropStage === stage.id
                      return (
                        <button
                          key={stage.id}
                          onClick={() => setCropStage(active ? '' : stage.id)}
                          style={{
                            background: active ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                            border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '100px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span style={{
                            fontFamily: F.inter,
                            fontSize: '13px',
                            fontWeight: active ? 600 : 400,
                            color: active ? '#0a1a0a' : 'rgba(255,255,255,0.7)',
                            lineHeight: 1.3,
                          }}>
                            {stage.en}
                          </span>
                          <span style={{
                            fontFamily: F.telugu,
                            fontSize: '11px',
                            color: active ? '#0a1a0a' : 'rgba(255,255,255,0.45)',
                            lineHeight: 1.3,
                          }}>
                            {stage.te}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── INPUT 4: SOIL TYPE ───────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: sectionDelays[2], ease: 'easeOut' }}
              style={{ marginBottom: '40px' }}
            >
              <FieldLabel en="Soil Type" te="నేల రకం" />

              {/* Search input with autocomplete dropdown */}
              <div ref={soilWrapperRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={soilType}
                  onChange={e => {
                    setSoilType(e.target.value)
                    setShowSoilDropdown(e.target.value.trim().length > 0)
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#f59e0b'
                    if (soilType.trim().length > 0) setShowSoilDropdown(true)
                  }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  placeholder="Search or type your soil type..."
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fffbf0',
                    fontFamily: F.inter,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Autocomplete dropdown */}
                {showSoilDropdown && (() => {
                  const q = soilType.toLowerCase()
                  const matches = SOIL_OPTIONS.filter(s =>
                    s.en.toLowerCase().includes(q) || s.te.includes(soilType)
                  )
                  return (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}>
                      {matches.length > 0 ? matches.map((s, i) => (
                        <div
                          key={s.id}
                          onMouseDown={() => {
                            setSoilType(s.en)
                            setShowSoilDropdown(false)
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: i < matches.length - 1 ? '1px solid #f3f4f6' : 'none',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <span style={{ fontFamily: F.inter, fontSize: '13px', color: '#1a1a1a', display: 'block' }}>
                            {s.en}
                          </span>
                          <span style={{ fontFamily: F.telugu, fontSize: '11px', color: '#f59e0b', display: 'block' }}>
                            {s.te}
                          </span>
                        </div>
                      )) : (
                        <div style={{ padding: '10px 16px', fontFamily: F.inter, fontSize: '13px', color: '#9ca3af' }}>
                          No soil found
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Quick options label */}
              <p style={{
                fontFamily: F.inter,
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '14px 0 10px',
              }}>
                Common soils in Telangana:
              </p>

              {/* 2×2 option cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {SOIL_QUICK.map(soil => {
                  const active = soilType === soil.en
                  return (
                    <button
                      key={soil.id}
                      onClick={() => {
                        setSoilType(active ? '' : soil.en)
                        setShowSoilDropdown(false)
                      }}
                      style={{
                        background: active ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                        border: active ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <p style={{
                        fontFamily: F.inter,
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#fffbf0',
                        margin: '0 0 2px',
                      }}>
                        {soil.en}
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: '12px', color: '#f59e0b', margin: '0 0 5px' }}>
                        {soil.te}
                      </p>
                      <p style={{
                        fontFamily: F.inter,
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        margin: '0 0 4px',
                        lineHeight: 1.4,
                      }}>
                        {soil.desc}
                      </p>
                      <p style={{
                        fontFamily: F.inter,
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.3)',
                        margin: 0,
                        lineHeight: 1.4,
                        fontStyle: 'italic',
                      }}>
                        {soil.char}
                      </p>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* ── INPUT 5: PLOT SIZE ────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: sectionDelays[3], ease: 'easeOut' }}
              className={shaking.plotSize ? 'fa-shake-anim' : ''}
              style={{ marginBottom: '40px' }}
            >
              <FieldLabel en="Plot Size" te="పొలం వైశాల్యం" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  value={plotSize}
                  onChange={e => {
                    setPlotSize(e.target.value)
                    setErrors(prev => ({ ...prev, plotSize: null }))
                  }}
                  placeholder="e.g. 2.5"
                  min="0"
                  step="0.1"
                  style={{
                    flex: '0 0 60%',
                    background: 'rgba(255,255,255,0.06)',
                    border: errors.plotSize
                      ? '1px solid #dc2626'
                      : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: '#fffbf0',
                    fontFamily: F.inter,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    appearance: 'textfield',
                    MozAppearance: 'textfield',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#f59e0b' }}
                  onBlur={e => {
                    e.target.style.borderColor = errors.plotSize
                      ? '#dc2626'
                      : 'rgba(255,255,255,0.15)'
                  }}
                />
                <select
                  value={plotSizeUnit}
                  onChange={e => setPlotSizeUnit(e.target.value)}
                  style={{
                    flex: '0 0 40%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: '#fffbf0',
                    fontFamily: F.inter,
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#f59e0b' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
                >
                  <option value="acres" style={{ background: '#1a1200', color: '#fffbf0' }}>Acres / ఎకరాలు</option>
                  <option value="guntas" style={{ background: '#1a1200', color: '#fffbf0' }}>Guntas / గుంటలు</option>
                  <option value="cents" style={{ background: '#1a1200', color: '#fffbf0' }}>Cents / సెంట్లు</option>
                  <option value="hectares" style={{ background: '#1a1200', color: '#fffbf0' }}>Hectares / హెక్టార్లు</option>
                </select>
              </div>

              {errors.plotSize && (
                <p style={{ fontFamily: F.inter, fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                  {errors.plotSize}
                </p>
              )}
            </motion.div>

            {/* ── SUBMIT BUTTON ─────────────────────────────── */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
              whileHover={!isSubmitting ? { scale: 1.01, boxShadow: '0 0 40px rgba(245,158,11,0.4)' } : {}}
              whileTap={!isSubmitting ? { scale: 0.99 } : {}}
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: '40px',
                background: '#f59e0b',
                border: 'none',
                borderRadius: '100px',
                padding: '18px',
                cursor: isSubmitting ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'box-shadow 0.2s',
              }}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={20} color="#0a1a0a" className="fa-spin-anim" />
                  <span style={{ fontFamily: F.inter, fontSize: '16px', fontWeight: 700, color: '#0a1a0a' }}>
                    Fetching your farm data...
                  </span>
                </div>
              ) : (
                <>
                  <span style={{ fontFamily: F.inter, fontSize: '16px', fontWeight: 700, color: '#0a1a0a' }}>
                    Analyse My Farm →
                  </span>
                  <span style={{ fontFamily: F.telugu, fontSize: '13px', color: '#0a1a0a' }}>
                    విశ్లేషణ ప్రారంభించండి
                  </span>
                </>
              )}
            </motion.button>

            {errors.api && (
              <p style={{ fontFamily: F.inter, fontSize: '14px', color: '#dc2626', marginTop: '12px', textAlign: 'center', fontWeight: 500 }}>
                {errors.api}
              </p>
            )}

              </div>{/* /form fields */}
            </div>{/* /LEFT COLUMN */}

            {/* ── RIGHT COLUMN (45%) ─────────────────────────── */}
            <div
              className="w-full lg:w-[45%]"
              style={{ padding: '80px clamp(16px, 5vw, 48px) 48px 32px' }}
            >
              {/* Spacer to align with form card start (below titles) */}
              <div style={{ height: '78px', flexShrink: 0 }} />
              {/* Info card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '24px',
                }}
              >
                <h3 style={{
                  fontFamily: F.playfair,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#fffbf0',
                  margin: '0 0 20px',
                }}>
                  Why FarmAlert?
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    {
                      Icon: Satellite,
                      en: 'Real-time satellite weather data for your exact field location',
                      te: 'మీ పొలానికి నిజ సమయ వాతావరణ డేటా',
                    },
                    {
                      Icon: Brain,
                      en: 'AI-powered adaptation plans in Telugu and English',
                      te: 'తెలుగులో AI సూచనలు',
                    },
                    {
                      Icon: Shield,
                      en: '8 climate risk types monitored continuously for your crop',
                      te: '8 వాతావరణ ప్రమాదాలు నిరంతర నిఘా',
                    },
                  ].map(({ Icon, en, te }, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Icon size={18} color="#f59e0b" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p style={{ fontFamily: F.inter, fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '0 0 3px', lineHeight: 1.5 }}>
                          {en}
                        </p>
                        <p style={{ fontFamily: F.telugu, fontSize: '12px', color: '#f59e0b', margin: 0 }}>
                          {te}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Photo gallery */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80"
                    alt="Farm"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80"
                    alt="Farm"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                  />
                </div>
                <img
                  src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
                  alt="Farm"
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                />
                <p style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span style={{ fontFamily: F.inter, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Protecting farms across Telangana
                  </span>
                  <span style={{ fontFamily: F.telugu, fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '6px' }}>
                    తెలంగాణ అంతటా పొలాలను రక్షిస్తున్నాం
                  </span>
                </p>
              </motion.div>
            </div>{/* /RIGHT COLUMN */}

          </div>
          )}
        </div>
      ) : (
        <ResultsView
          backendData={analysisData}
          onBack={() => setShowResults(false)}
          cropStage={cropStage}
          plotSizeOriginal={plotSize}
          plotSizeUnit={plotSizeUnit}
        />
      )}
    </div>
  )
}

// ─── Results View helpers ────────────────────────────────────
const LIGHT_CARD = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
}

const SOFT_CARD = {
  background: 'rgba(255,255,255,0.76)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.52)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
}

const SEV = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', cls: '' },
  WARNING:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a', cls: '' },
  SAFE:     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', cls: '' },
  ADVISORY: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', cls: '' },
}

const CT  = { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 500, color: '#1a1a1a' }
const CTE = { fontFamily: "'Noto Sans Telugu', sans-serif",  fontSize: 12, fontWeight: 400, color: '#999999' }
const DV  = { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 36, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.5px' }
const SL  = { fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 400, color: '#999999',
              textTransform: 'uppercase', letterSpacing: '1px' }
const STE = { fontFamily: "'Noto Sans Telugu', sans-serif",  fontSize: 11, color: '#bbbbbb' }
const SUB = { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 400, color: '#999999' }

function RVBadge({ severity }) {
  const s = SEV[severity] || SEV.ADVISORY
  return (
    <span style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.text,
      border: `1px solid ${s.border}`,
      borderRadius: 100, padding: '4px 10px',
      whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {severity}
    </span>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <p style={{ fontFamily: F.inter, fontSize: 11, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: F.inter, fontSize: 11, color: p.stroke || p.fill, margin: '2px 0 0' }}>
          {p.name === 'temp' ? `${p.value}°C` : p.name === 'rain' ? `${p.value}%` : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  )
}

// ─── Language Toggle ──────────────────────────────────────────
function LanguageToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      <button
        onClick={() => onChange('telugu')}
        style={{
          fontFamily: F.inter,
          fontSize: 12,
          fontWeight: 600,
          background: value === 'telugu' ? '#16a34a' : 'transparent',
          color: value === 'telugu' ? '#ffffff' : '#999',
          border: value === 'telugu' ? 'none' : '1px solid #e5e7eb',
          borderRadius: 100,
          padding: '4px 14px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        తెలుగు
      </button>
      <button
        onClick={() => onChange('english')}
        style={{
          fontFamily: F.inter,
          fontSize: 12,
          fontWeight: 600,
          background: value === 'english' ? '#16a34a' : 'transparent',
          color: value === 'english' ? '#ffffff' : '#999',
          border: value === 'english' ? 'none' : '1px solid #e5e7eb',
          borderRadius: 100,
          padding: '4px 14px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        English
      </button>
    </div>
  )
}

// ─── Crop Display ─────────────────────────────────────────────
const CropDisplay = React.memo(({ cropImage }) => {
  return (
    <div style={{
      position: 'relative',
      width: '300px',
      height: '320px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto'
    }}>
      <div style={{
        position: 'absolute',
        width: '420px',
        height: '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 60%, transparent 80%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <img
        src={cropImage}
        style={{
          width: '480px',
          height: '560px',
          objectFit: 'contain',
          transform: 'rotate(-8deg)',
          position: 'relative',
          zIndex: 2,
          marginLeft: '-40px'
        }}
        alt="crop"
      />
    </div>
  )
})

// ─── Forecast Modal ───────────────────────────────────────────
function ForecastModal({ day, wd, selectedCrop, cropStage, stageInfo, onClose, onPrev, onNext }) {
  const d = wd[day] || {}
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const temp     = Math.round(d.temp_max || 0)
  const rain     = Math.round(d.precipitation || 0)
  const humidity = Math.round(d.relative_humidity || 0)
  const wind     = Math.round(d.wind_speed || 0)
  const uv       = (d.uv_index || 0).toFixed(1)
  const soilPct  = Math.round((d.soil_moisture || 0) * 100)
  const tempColor = temp > 40 ? '#dc2626' : temp > 38 ? '#d97706' : '#16a34a'
  const dayRisk   = temp > 40 ? 'CRITICAL' : temp > 38 || soilPct < 20 ? 'WARNING' : 'SAFE'
  const dateStr   = d.date ? new Date(d.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }) : `Day ${day + 1}`

  const actions = []
  if (temp > 40) actions.push({ en: `Critical heatwave (${temp}°C) — delay all field work; irrigate at 6am and 6pm only`, te: `విమర్శనాత్మక వేడి తరంగం (${temp}°C) — పొలం పనులు వాయిదా వేయండి; ఉదయం 6 మరియు సాయంత్రం 6 గంటలకు మాత్రమే నీళ్ళు పెట్టండి` })
  else if (temp > 38) actions.push({ en: `High heat (${temp}°C) — irrigate before 7am to minimise evaporation losses`, te: `అధిక వేడి (${temp}°C) — నీటి ఆవిరి తగ్గించడానికి ఉదయం 7 గంటలకు ముందే నీళ్ళు పెట్టండి` })
  if (rain > 10) actions.push({ en: `Heavy rain (${rain}mm) expected — clear drainage channels and avoid spraying`, te: `భారీ వర్షం (${rain}mm) అంచనా — మురుగు కాలువలు తెరవండి, పిచికారీ కార్యకలాపాలు మానుకోండి` })
  else if (rain > 2) actions.push({ en: `Light rain (${rain}mm) — skip planned irrigation; monitor for fungal disease`, te: `తేలికపాటి వర్షం (${rain}mm) — నిర్ణీత తడి దాటవేయండి; శిలీంధ్ర తెగుళ్లు గమనించండి` })
  if (wind < 12) actions.push({ en: `Low wind (${wind}km/h) — ideal conditions for pesticide or fungicide spraying`, te: `తక్కువ గాలి (${wind}km/h) — పురుగు మందులు లేదా శిలీంధ్రనాశక పిచికారీకి అనుకూలమైన రోజు` })
  if (soilPct < 25) actions.push({ en: `Low soil moisture (${soilPct}%) — irrigate the evening before to prevent crop stress`, te: `తక్కువ నేల తేమ (${soilPct}%) — పంట ఒత్తిడి నివారించడానికి ముందు సాయంత్రం నీళ్ళు పెట్టండి` })
  if (actions.length === 0) actions.push({ en: `Favourable conditions — routine field monitoring and standard crop care`, te: `అనుకూలమైన పరిస్థితులు — రొటీన్ పొలం పరిశీలన మరియు పంట సంరక్షణ` })

  const cropImpact = temp > 40
    ? { en: `${temp}°C is critically high for ${selectedCrop}${stageInfo ? ` at ${stageInfo.label} stage` : ''}. Spikelet sterility, flower drop, and permanent yield loss are likely without immediate action.`, te: `${temp}°C ఉష్ణోగ్రత ${selectedCrop} పంటకు${stageInfo ? ` ${stageInfo.label} దశలో` : ''} అత్యంత ప్రమాదకరం. వెంటనే చర్య తీసుకోకపోతే దిగుబడి శాశ్వతంగా దెబ్బతింటుంది.` }
    : temp > 38
    ? { en: `${temp}°C causes heat stress for ${selectedCrop}${stageInfo ? ` at ${stageInfo.label} stage` : ''}. Growth slows and water requirements rise by 20–30%.`, te: `${temp}°C వేడి ${selectedCrop} పంటకు${stageInfo ? ` ${stageInfo.label} దశలో` : ''} ఒత్తిడి కలిగిస్తుంది. పెరుగుదల నెమ్మదిస్తుంది, నీటి అవసరం 20–30% పెరుగుతుంది.` }
    : rain > 10
    ? { en: `Heavy rain may cause waterlogging for ${selectedCrop}. Ensure drainage is clear before this day to protect root health.`, te: `భారీ వర్షం ${selectedCrop} పంటకు నీటి నిల్వ ఒత్తిడి కలిగించవచ్చు. మురుగు కాలువలు ముందే తెరవండి.` }
    : { en: `Conditions are manageable for ${selectedCrop}${stageInfo ? ` at ${stageInfo.label} stage` : ''}. Continue standard care and monitor daily.`, te: `${selectedCrop} పంటకు${stageInfo ? ` ${stageInfo.label} దశలో` : ''} పరిస్థితులు అనుకూలంగా ఉన్నాయి. రొటీన్ సంరక్షణ కొనసాగించండి.` }

  const SEVc = { CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }, WARNING: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }, SAFE: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } }
  const sc = SEVc[dayRisk]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', borderRadius: 24, padding: '32px 40px', maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: F.playfair, fontSize: 28, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Day {day + 1} Forecast</h2>
            <p style={{ fontFamily: F.inter, fontSize: 14, color: '#666', margin: '4px 0 0' }}>{dateStr}</p>
            {stageInfo && <p style={{ fontFamily: F.telugu, fontSize: 14, color: '#f59e0b', margin: '2px 0 0' }}>{stageInfo.label} దశ</p>}
          </div>
          <button onClick={onClose} style={{ background: '#f8f8f8', border: 'none', borderRadius: 100, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <XIcon size={20} strokeWidth={2} color="#666" />
          </button>
        </div>

        {/* Giant temperature */}
        <div style={{ textAlign: 'center', marginBottom: 24, padding: '24px 0', background: '#f8fafc', borderRadius: 16 }}>
          <p style={{ fontFamily: F.dmSans, fontSize: 80, fontWeight: 700, color: tempColor, margin: 0, lineHeight: 1, letterSpacing: '-2px' }}>{temp}°</p>
          <p style={{ fontFamily: F.inter, fontSize: 14, color: '#666', margin: '8px 0 0' }}>Feels like {temp + 2}°C</p>
          <span style={{ display: 'inline-block', marginTop: 12, fontFamily: F.inter, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 100, padding: '4px 14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {dayRisk} DAY
          </span>
        </div>

        {/* 2×2 weather stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Rain', te: 'వర్షం', value: `${rain}mm`, Icon: CloudRain, color: '#3b82f6' },
            { label: 'Humidity', te: 'తేమ', value: `${humidity}%`, Icon: Droplets, color: '#06b6d4' },
            { label: 'Wind', te: 'గాలి', value: `${wind}km/h`, Icon: Wind, color: '#8b5cf6' },
            { label: 'UV Index', te: 'UV సూచిక', value: uv, Icon: Sun, color: '#f59e0b' },
          ].map(({ label, te, value, Icon, color }) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={18} color={color} strokeWidth={2} />
              <div>
                <p style={{ fontFamily: F.inter, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
                <p style={{ fontFamily: F.telugu, fontSize: 10, color: '#bbb', margin: '1px 0 2px' }}>{te}</p>
                <p style={{ fontFamily: F.dmSans, fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-0.3px' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: F.inter, fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>Actions for This Day</p>
          <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '0 0 14px' }}>ఈ రోజు చేయవలసినవి</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map((action, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle size={16} color="#16a34a" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: F.inter, fontSize: 13, color: '#1a1a1a', margin: '0 0 2px', lineHeight: 1.5 }}>{action.en}</p>
                  <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#666', margin: 0 }}>{action.te}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crop impact */}
        <div style={{ background: sc.bg, borderRadius: 12, padding: '16px 20px', marginBottom: 24, borderLeft: `4px solid ${sc.text}` }}>
          <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>
            How this affects your {selectedCrop}{stageInfo ? ` (${stageInfo.label} stage)` : ''}
          </p>
          <p style={{ fontFamily: F.inter, fontSize: 13, color: '#444', margin: '0 0 6px', lineHeight: 1.6 }}>{cropImpact.en}</p>
          <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#666', margin: 0, lineHeight: 1.7 }}>{cropImpact.te}</p>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button onClick={onPrev} disabled={day === 0}
            style={{ fontFamily: F.inter, fontSize: 14, fontWeight: 500, color: day === 0 ? '#ccc' : '#1a1a1a', background: 'none', border: `1px solid ${day === 0 ? '#eee' : '#e5e7eb'}`, borderRadius: 100, padding: '8px 20px', cursor: day === 0 ? 'default' : 'pointer' }}>
            ← Previous Day
          </button>
          <button onClick={onNext} disabled={day >= wd.length - 1}
            style={{ fontFamily: F.inter, fontSize: 14, fontWeight: 500, color: day >= wd.length - 1 ? '#ccc' : '#1a1a1a', background: 'none', border: `1px solid ${day >= wd.length - 1 ? '#eee' : '#e5e7eb'}`, borderRadius: 100, padding: '8px 20px', cursor: day >= wd.length - 1 ? 'default' : 'pointer' }}>
            Next Day →
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Results View ─────────────────────────────────────────────
function ResultsView({ backendData, onBack, cropStage, plotSizeOriginal, plotSizeUnit }) {
  console.log("Full API response:", JSON.stringify(backendData, null, 2))
  console.log("Max temp:", backendData?.weather?.max_temp?.[0])
  console.log("Rain:", backendData?.weather?.rain_probability?.[0])
  console.log("Overall risk:", backendData?.overall_risk)
  console.log("Summary EN:", backendData.summary_en)
  console.log("Summary TE:", backendData.summary_te)
  console.log("Farm Summary object:", backendData.farm_summary)

  const [chartMode,  setChartMode]  = useState('temperature')
  const [actionTab,  setActionTab]  = useState('today')
  const [cardLanguage, setCardLanguage] = useState(backendData.language || 'telugu')
  const [modalDay, setModalDay] = useState(null)

  const selectedCrop = backendData.selected_crop
  const plotSize = backendData.plot_size
  const unitTeLabels = { guntas: 'గుంటలు', cents: 'సెంట్లు', hectares: 'హెక్టార్లు' }
  const plotSizeDisplay = (plotSizeUnit && plotSizeUnit !== 'acres' && plotSizeOriginal)
    ? `${plotSizeOriginal} ${unitTeLabels[plotSizeUnit]} (${plotSize} acres)`
    : `${plotSize} acres`
  const stageInfo = cropStage && selectedCrop ? STAGE_AGE_DISPLAY[selectedCrop]?.[cropStage] : null
  const cropAgeLabel = stageInfo ? `${stageInfo.label} • ${stageInfo.age}` : 'Age unknown'
  const location = backendData.location

  const center = location ? [location.lat, location.lng] : [17.9689, 79.5941]

  const cropData = {
    paddy: {
      img: '/crops/paddy-3d.png',
      nameEn: 'Paddy Farm',
      nameTe: 'వరి పొలం'
    },
    cotton: {
      img: '/crops/cotton-3d.png',
      nameEn: 'Cotton Farm',
      nameTe: 'పత్తి పొలం'
    },
    chilli: {
      img: '/crops/chilli-3d.png',
      nameEn: 'Chilli Farm',
      nameTe: 'మిర్చి పొలం'
    },
    soybean: {
      img: '/crops/soybean-3d.png',
      nameEn: 'Soybean Farm',
      nameTe: 'సోయా పొలం'
    },
    turmeric: {
      img: '/crops/turmeric-3d.png',
      nameEn: 'Turmeric Farm',
      nameTe: 'పసుపు పొలం'
    }
  }

  const currentCrop = cropData[selectedCrop] || cropData.paddy

  const wd  = backendData.weather_data || []
  const wd0 = wd[0] || {}

  const weatherData = wd.map(d => ({
    day:  d.day,
    temp: d.temp_max,
    rain: d.precipitation
  }))

  const soilTrend = wd.map(d => ({
    day: d.day,
    m:   Math.round((d.soil_moisture || 0) * 100)
  }))

  const todaySoilSurface = Math.round((wd0.soil_moisture || 0) * 100)
  const todaySoilRoot    = Math.max(10, Math.round(todaySoilSurface - 6))
  const soilRadial = [
    { name: 'Root',    value: todaySoilRoot,    fill: '#f59e0b' },
    { name: 'Surface', value: todaySoilSurface, fill: '#16a34a' },
  ]

  const today = {
    temp:      Math.round(wd0.temp_max           || 0),
    rain:      Math.round(wd0.precipitation      || 0),
    humidity:  Math.round(wd0.relative_humidity  || 0),
    windSpeed: Math.round(wd0.wind_speed         || 0),
    uvIndex:   wd0.uv_index                      || 0,
    et0:       wd0.evapotranspiration            || 0,
  }
  const maxWindSpeed = Math.max(...wd.map(d => d.wind_speed || 0))

  // ── Predictive 7-day computed values ──────────────────────────
  const wd7 = wd.slice(0, 7)
  const peakTemp7       = Math.max(...wd7.map(d => d.temp_max || 0))
  const peakTemp7DayIdx = wd7.findIndex(d => d.temp_max === peakTemp7)
  const nextRainIdx     = wd.findIndex(d => (d.precipitation || 0) > 2)
  const soilDay7Pct     = wd[6] ? Math.round((wd[6].soil_moisture || 0) * 100) : todaySoilSurface
  const peakWind7       = Math.max(...wd7.map(d => d.wind_speed || 0))
  const peakWind7DayIdx = wd7.findIndex(d => d.wind_speed === peakWind7)
  const heatwaveInDayIdx = wd7.findIndex(d => (d.temp_max || 0) > 38)
  const predictiveSeverity = peakTemp7 > 40 ? 'CRITICAL' : peakTemp7 > 38 ? 'WARNING' : nextRainIdx === -1 ? 'WARNING' : 'SAFE'

  // Best action windows from 7-day data
  const irrigDays    = wd7.map((d, i) => ({ d, i })).filter(({ d }) => (d.temp_max || 0) < 38 && (d.soil_moisture || 0) < 0.35).map(({ i }) => `D${i + 1}`)
  const sprayDays    = wd7.map((d, i) => ({ d, i })).filter(({ d }) => (d.wind_speed || 0) < 15).map(({ i }) => `D${i + 1}`)
  const avoidFertDays= wd7.map((d, i) => ({ d, i })).filter(({ d }) => (d.temp_max || 0) > 39).map(({ i }) => `D${i + 1}`)
  const harvestWindow = (() => {
    let streak = 0, start = -1
    for (let i = 0; i < wd.length; i++) {
      if ((wd[i].precipitation || 0) < 2) { if (streak === 0) start = i; streak++; if (streak >= 4) return `D${start + 1}–D${Math.min(start + 7, wd.length)}` }
      else { streak = 0; start = -1 }
    }
    return 'Not in forecast'
  })()

  // Incoming alert events
  const alertEvents = (() => {
    const events = []
    const heatIdx = wd.findIndex(d => (d.temp_max || 0) > 38)
    if (heatIdx >= 0) events.push({ idx: heatIdx, day: heatIdx + 1, title: 'Heatwave Peak', te: 'వేడి తరంగం శిఖరం', desc: `Temperature reaches ${Math.round(wd[heatIdx].temp_max)}°C`, te_desc: `ఉష్ణోగ్రత ${Math.round(wd[heatIdx].temp_max)}°C కి చేరుతుంది`, sev: wd[heatIdx].temp_max > 40 ? 'CRITICAL' : 'WARNING' })
    const rainIdx = wd.findIndex(d => (d.precipitation || 0) > 5)
    if (rainIdx >= 0) events.push({ idx: rainIdx, day: rainIdx + 1, title: 'Rain Expected', te: 'వర్షం అంచనా', desc: `${Math.round(wd[rainIdx].precipitation)}mm expected`, te_desc: `${Math.round(wd[rainIdx].precipitation)} మి.మీ. వర్షం`, sev: wd[rainIdx].precipitation > 20 ? 'WARNING' : 'ADVISORY' })
    const soilIdx = wd.findIndex(d => (d.soil_moisture || 0) < 0.25)
    if (soilIdx >= 0) events.push({ idx: soilIdx, day: soilIdx + 1, title: 'Soil Moisture Critical', te: 'నేల తేమ విమర్శనాత్మకం', desc: `Root zone drops below 20%`, te_desc: `వేరు స్థాయి తేమ 20% కి పడిపోతుంది`, sev: 'WARNING' })
    if (events.length === 0) events.push({ idx: 6, day: 7, title: 'Stable Conditions', te: 'స్థిరమైన పరిస్థితులు', desc: 'No critical events in next 7 days', te_desc: 'వచ్చే 7 రోజుల్లో విమర్శనాత్మక సంఘటనలు లేవు', sev: 'SAFE' })
    return events.sort((a, b) => a.day - b.day)
  })()

  const overallRisk = backendData.risks?.some(r => r.severity === 'CRITICAL') ? 'CRITICAL'
    : backendData.risks?.some(r => r.severity === 'WARNING')  ? 'WARNING'
    : backendData.risks?.some(r => r.severity === 'ADVISORY') ? 'ADVISORY'
    : 'SAFE'

  console.log("Max temp mapped:", wd0.temp_max)
  console.log("Overall risk:", overallRisk)

  const riskIconMap = {
    heatwave: Thermometer,
    drought: CloudOff,
    flood: CloudRain,
    soil_moisture: Droplets,
    harvest_window: Calendar,
    wind: Wind,
    pest: AlertTriangle,
    evapotranspiration: Layers
  }

  const risks = (backendData.risks || []).map(r => ({
    Icon: riskIconMap[r.key] || AlertTriangle,
    en: r.en_name,
    te: r.te_name,
    sev: r.severity
  }))

  const historical = backendData.historical || []

  const actionItems = {
    today: (backendData.action_plan?.today || []).map(item => ({
      Icon: item.icon_type === 'warning' ? AlertTriangle : CheckCircle,
      ic:   item.icon_type === 'warning' ? '#f59e0b' : '#16a34a',
      en:   item.en,
      te:   item.te
    })),
    week: (backendData.action_plan?.week || []).map(item => ({
      Icon: item.icon_type === 'warning' ? AlertTriangle : CheckCircle,
      ic:   item.icon_type === 'warning' ? '#f59e0b' : '#16a34a',
      en:   item.en,
      te:   item.te
    })),
    month: (backendData.action_plan?.month || []).map(item => ({
      Icon: item.icon_type === 'warning' ? AlertTriangle : CheckCircle,
      ic:   item.icon_type === 'warning' ? '#f59e0b' : '#16a34a',
      en:   item.en,
      te:   item.te
    }))
  }

  const tabs = [
    { key: 'today', label: 'Today'      },
    { key: 'week',  label: 'This Week'  },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .weather-day-card {
          min-width: 80px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          padding: 12px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s, transform 0.2s, border-color 0.2s;
        }
        .weather-day-card:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .weather-day-card.selected-today {
          background: rgba(245,158,11,0.4) !important;
          border: 1px solid #f59e0b !important;
        }
      `}</style>

      {/* Fixed background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img
          src="/results-bg.png"
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Two-column layout */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: '100vh', paddingTop: 88, overflow: 'visible' }}>

        {/* Absolutely positioned Crop Info (top left of ResultsView) */}
        <div style={{
          position: 'absolute',
          top: 80,
          left: 40,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <h1 style={{
            fontFamily: F.inter,
            fontSize: '48px',
            fontWeight: 500,
            color: '#1a1a1a',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-1px',
          }}>
            {currentCrop.nameEn}
          </h1>
          <p style={{ fontFamily: F.telugu, fontSize: 16, fontWeight: 400, color: '#16a34a', margin: '4px 0 10px' }}>
            {currentCrop.nameTe}
          </p>

          {/* Inline pills — Plot Size + Crop Age */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 100, padding: '4px 12px',
              fontFamily: F.inter, fontSize: 12, color: '#666666',
            }}>
              <Ruler size={12} color="#666" strokeWidth={2} /> {plotSizeDisplay}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 100, padding: '4px 12px',
              fontFamily: F.inter, fontSize: 12, color: '#666666',
            }}>
              <Calendar size={12} color="#666" strokeWidth={2} /> {cropAgeLabel}
            </span>
          </div>
        </div>

        {/* ══ LEFT ══ */}
        <div style={{
          width: '40%', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          padding: '32px 20px 32px 48px',
          background: 'transparent',
        }}>

          {/* Spacer to clear absolutely positioned crop info header */}
          <div style={{ height: 160, flexShrink: 0 }} />

          {/* Crop display */}
          <CropDisplay cropImage={currentCrop.img} />

          {/* Action Plan card */}
          <div style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            marginTop: 140,
            marginBottom: 8,
            minHeight: 'auto',
            height: 'auto',
            overflow: 'visible',
            flexShrink: 0,
          }}>
            <p style={{ ...CT, margin: '0 0 2px' }}>Action Plan</p>
            <p style={{ ...CTE, margin: '0 0 12px' }}>చర్య ప్రణాళిక</p>

            {/* Language Toggle */}
            <LanguageToggle value={cardLanguage} onChange={setCardLanguage} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActionTab(t.key)}
                  style={{
                    fontFamily: F.inter, fontSize: 12, fontWeight: 600,
                    background: actionTab === t.key ? '#f59e0b' : 'transparent',
                    color:      actionTab === t.key ? '#1a1a1a' : '#999',
                    border:     actionTab === t.key ? 'none' : '1px solid #e5e7eb',
                    borderRadius: 100, padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Action items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {actionItems[actionTab].map(({ Icon, ic, en, te }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <Icon size={14} color={ic} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {cardLanguage === 'telugu' ? (
                      <p style={{ fontFamily: F.telugu, fontSize: 13, color: '#1a1a1a', margin: 0 }}>{te}</p>
                    ) : (
                      <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{en}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Farm Summary Card */}
          <div style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            marginTop: 16,
            flexShrink: 0,
          }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: F.inter, fontSize: 15, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Farm Summary</p>
              <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '2px 0 0' }}>పొలం సారాంశం</p>
            </div>

            {/* Language Toggle */}
            <LanguageToggle value={cardLanguage} onChange={setCardLanguage} />

            {(() => {
              const fs = backendData.farm_summary
              if (!fs) return (
                <p style={{ fontFamily: F.inter, fontSize: 13, color: '#999', margin: 0 }}>
                  No summary available.
                </p>
              )
              const iconMap = { cloud: Cloud, layers: Layers, alert: AlertTriangle, lightbulb: Zap }
              const sections = [fs.weather, fs.soil, fs.risk, fs.recommendation].filter(Boolean)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sections.map((sec, i) => {
                    const Icon = iconMap[sec.icon_type] || Zap
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          flexShrink: 0,
                          width: 28, height: 28,
                          borderRadius: 8,
                          background: `${sec.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 1,
                        }}>
                          <Icon size={14} color={sec.color} strokeWidth={2} />
                        </div>
                        <div>
                          <p style={{ fontFamily: F.inter, fontSize: 11, fontWeight: 600, color: sec.color, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {cardLanguage === 'telugu' ? sec.title_te : sec.title_en}
                          </p>
                          <p style={{
                            fontFamily: cardLanguage === 'telugu' ? F.telugu : F.inter,
                            fontSize: 13,
                            color: '#1a1a1a',
                            lineHeight: 1.6,
                            margin: 0,
                          }}>
                            {cardLanguage === 'telugu' ? sec.text_te : sec.text_en}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Stage Advice Card */}
          {(backendData.stage_advice_en?.length > 0 || backendData.stage_advice_te?.length > 0) && (
            <div style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: 20,
              width: '100%',
              marginTop: 16,
              flexShrink: 0,
            }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: F.inter, fontSize: 15, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Stage Advice</p>
                <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '2px 0 0' }}>
                  {stageInfo ? `${stageInfo.label} దశ సూచనలు` : 'దశ సూచనలు'}
                </p>
              </div>
              <LanguageToggle value={cardLanguage} onChange={setCardLanguage} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(cardLanguage === 'telugu'
                  ? (backendData.stage_advice_te || [])
                  : (backendData.stage_advice_en || [])
                ).map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <Sprout size={14} color="#16a34a" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{
                      fontFamily: cardLanguage === 'telugu' ? F.telugu : F.inter,
                      fontSize: 13,
                      color: '#1a1a1a',
                      margin: 0,
                      lineHeight: 1.6,
                    }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Irrigation Advice Card */}
          {(backendData.irrigation_advice_en?.length > 0 || backendData.irrigation_advice_te?.length > 0) && (
            <div style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: 20,
              width: '100%',
              marginTop: 16,
              flexShrink: 0,
            }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: F.inter, fontSize: 15, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Irrigation Plan</p>
                <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '2px 0 0' }}>నీటిపారుదల ప్రణాళిక</p>
              </div>
              <LanguageToggle value={cardLanguage} onChange={setCardLanguage} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(cardLanguage === 'telugu'
                  ? (backendData.irrigation_advice_te || [])
                  : (backendData.irrigation_advice_en || [])
                ).map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <Droplets size={14} color="#3b82f6" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{
                      fontFamily: cardLanguage === 'telugu' ? F.telugu : F.inter,
                      fontSize: 13,
                      color: '#1a1a1a',
                      margin: 0,
                      lineHeight: 1.6,
                    }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ══ RIGHT — scrollable cards ══ */}
        <div style={{ flex: 1, padding: '24px 32px 80px 8px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* ROW 1 — Predictive Farm Status */}
          <div style={{ ...LIGHT_CARD, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: F.dmSans, fontSize: 18, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-0.3px' }}>Your Farm This Week</h3>
              <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '3px 0 0' }}>మీ పొలం ఈ వారం స్థితి</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: predictiveSeverity === 'CRITICAL' ? '#fef2f2' : predictiveSeverity === 'WARNING' ? '#fffbeb' : '#f0fdf4',
                border: `2px solid ${predictiveSeverity === 'CRITICAL' ? '#fecaca' : predictiveSeverity === 'WARNING' ? '#fde68a' : '#bbf7d0'}`,
                borderRadius: 100, padding: '10px 20px',
              }}>
                {heatwaveInDayIdx >= 0 ? (
                  <Zap size={18} color={predictiveSeverity === 'CRITICAL' ? '#dc2626' : '#d97706'} strokeWidth={2} />
                ) : nextRainIdx === -1 ? (
                  <Droplets size={18} color="#d97706" strokeWidth={2} />
                ) : (
                  <ShieldCheck size={18} color="#16a34a" strokeWidth={2} />
                )}
                {heatwaveInDayIdx >= 0 ? (
                  <span style={{ fontFamily: F.dmSans, fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', color: predictiveSeverity === 'CRITICAL' ? '#dc2626' : '#d97706' }}>
                    {`Heatwave in ${heatwaveInDayIdx + 1} day${heatwaveInDayIdx === 0 ? '' : 's'}`}
                  </span>
                ) : nextRainIdx === -1 ? (
                  <span style={{ fontFamily: F.dmSans, fontSize: 14, fontWeight: 500, letterSpacing: '-0.3px', color: '#666666' }}>
                    Drought risk building
                  </span>
                ) : (
                  <span style={{ fontFamily: F.dmSans, fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', color: '#16a34a' }}>
                    Safe next 7 days
                  </span>
                )}
              </div>
              {(heatwaveInDayIdx >= 0 || nextRainIdx === -1) && (
                <p style={{ fontFamily: F.dmSans, fontSize: 14, fontWeight: 500, letterSpacing: '-0.3px', color: '#666666', margin: '8px 0 0' }}>
                  {heatwaveInDayIdx >= 0 ? `${heatwaveInDayIdx + 1} days until peak risk` : 'No rain in forecast'}
                </p>
              )}
            </div>
          </div>

          {/* ROW 2 — Predictive 4 Stat Boxes */}
          <div className="grid grid-cols-4 gap-3">

            {/* Peak Temp */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <Thermometer size={18} color="#dc2626" strokeWidth={2} />
              <p style={{ ...SL, margin: '10px 0 0' }}>PEAK TEMP</p>
              <p style={{ ...STE, margin: '2px 0 6px' }}>గరిష్ట ఉష్ణోగ్రత</p>
              <p style={{ ...DV, color: '#dc2626', margin: 0 }}>{Math.round(peakTemp7)}°C</p>
              <p style={{ ...SUB, margin: '6px 0 0' }}>on Day {peakTemp7DayIdx + 1}</p>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: peakTemp7 > 40 ? '#dc2626' : '#666', margin: 0 }}>
                  {peakTemp7 > 40 ? 'Critical — crop stress inevitable' : peakTemp7 > 38 ? 'High — irrigation critical' : 'Manageable this week'}
                </p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: peakTemp7 > 40 ? '#dc2626' : '#999', margin: '2px 0 0' }}>
                  {peakTemp7 > 40 ? 'పంట ఒత్తిడి తప్పదు' : peakTemp7 > 38 ? 'సాగు నీరు అత్యవసరం' : 'ఈ వారం నిర్వహించదగినది'}
                </p>
              </div>
            </div>

            {/* Next Rain */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <CloudRain size={18} color="#3b82f6" strokeWidth={2} />
              <p style={{ ...SL, margin: '10px 0 0' }}>NEXT RAIN</p>
              <p style={{ ...STE, margin: '2px 0 6px' }}>తదుపరి వర్షం</p>
              <p style={{ ...DV, color: '#3b82f6', margin: 0 }}>{nextRainIdx === -1 ? '—' : `D${nextRainIdx + 1}`}</p>
              <p style={{ ...SUB, margin: '6px 0 0' }}>{nextRainIdx === -1 ? 'No rain forecast' : `in ${nextRainIdx} days`}</p>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: nextRainIdx === -1 ? '#dc2626' : '#666', margin: 0 }}>
                  {nextRainIdx === -1 ? 'Plan irrigation now' : `${Math.round(wd[nextRainIdx]?.precipitation || 0)}mm Day ${nextRainIdx + 1}`}
                </p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: nextRainIdx === -1 ? '#dc2626' : '#999', margin: '2px 0 0' }}>
                  {nextRainIdx === -1 ? 'ఇప్పుడే నీటిపారుదల ప్రణాళిక వేయండి' : `రోజు ${nextRainIdx + 1} లో వర్షం`}
                </p>
              </div>
            </div>

            {/* Soil Day 7 */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <Droplets size={18} color="#06b6d4" strokeWidth={2} />
              <p style={{ ...SL, margin: '10px 0 0' }}>SOIL BY DAY 7</p>
              <p style={{ ...STE, margin: '2px 0 6px' }}>7వ రోజు నేల తేమ</p>
              <p style={{ ...DV, color: '#06b6d4', margin: 0 }}>{soilDay7Pct}%</p>
              <p style={{ ...SUB, margin: '6px 0 0' }}>{soilDay7Pct < todaySoilSurface ? '↓ Dropping' : '↑ Rising'}</p>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: soilDay7Pct < 25 ? '#dc2626' : '#666', margin: 0 }}>
                  {soilDay7Pct < 25 ? 'Critical by Day 7 — irrigate now' : 'Root zone trend stable'}
                </p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: soilDay7Pct < 25 ? '#dc2626' : '#999', margin: '2px 0 0' }}>
                  {soilDay7Pct < 25 ? '7వ రోజు నాటికి విమర్శనాత్మకం' : 'వేరు స్థాయి తేమ స్థిరంగా ఉంది'}
                </p>
              </div>
            </div>

            {/* Peak Wind */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <Wind size={18} color="#8b5cf6" strokeWidth={2} />
              <p style={{ ...SL, margin: '10px 0 0' }}>PEAK WIND</p>
              <p style={{ ...STE, margin: '2px 0 6px' }}>గరిష్ట గాలి</p>
              <p style={{ ...DV, color: '#8b5cf6', margin: 0 }}>{Math.round(peakWind7)}<span style={{ fontSize: 16 }}>km/h</span></p>
              <p style={{ ...SUB, margin: '6px 0 0' }}>on Day {peakWind7DayIdx + 1}</p>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: 0 }}>
                  {sprayDays.length > 0 ? `Safe spray: ${sprayDays[0]}` : 'Avoid spraying this week'}
                </p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: '2px 0 0' }}>
                  {sprayDays.length > 0 ? 'పిచికారీకి అనుకూలమైన రోజు' : 'ఈ వారం పిచికారీ మానుకోండి'}
                </p>
              </div>
            </div>
          </div>

          {/* ROW 3 — Soil / UV / Water Loss (expanded) */}
          <div className="grid grid-cols-3 gap-3">

            {/* Soil Moisture */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>Soil Moisture</p>
              <p style={{ ...CTE, margin: '0 0 10px' }}>నేల తేమ</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadialBarChart width={110} height={96} cx={55} cy={48} innerRadius={24} outerRadius={46} data={soilRadial} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }} />
                </RadialBarChart>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ ...DV, color: '#16a34a', margin: 0 }}>{todaySoilSurface}%</p>
                  <p style={{ ...SUB, margin: '2px 0 0' }}>Surface</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ ...DV, color: '#f59e0b', margin: 0 }}>{todaySoilRoot}%</p>
                  <p style={{ ...SUB, margin: '2px 0 0' }}>Root</p>
                </div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: todaySoilSurface < 30 ? '#dc2626' : '#666', margin: '0 0 2px' }}>
                  {todaySoilSurface < 30 ? 'Surface soil is drying fast' : 'Surface soil moisture is stable'}
                </p>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: 0 }}>Root zone: {todaySoilRoot}% (Optimal: 35%)</p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: todaySoilSurface < 30 ? '#dc2626' : '#999', margin: '2px 0 0' }}>
                  {todaySoilSurface < 30 ? 'నేల తేమ ప్రమాదకరంగా పడిపోయింది' : 'నేలలో తేమ సాధారణంగా ఉంది'}
                </p>
              </div>
            </div>

            {/* UV Index */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>UV Index</p>
              <p style={{ ...CTE, margin: '0 0 12px' }}>UV సూచిక</p>
              <p style={{ ...DV, color: '#dc2626', margin: 0 }}>{today.uvIndex.toFixed(1)}</p>
              <span style={{
                display: 'inline-block', marginTop: 10,
                fontFamily: F.inter, fontSize: 11, fontWeight: 600,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: 100, padding: '4px 10px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {today.uvIndex > 8 ? 'EXTREME' : today.uvIndex > 6 ? 'VERY HIGH' : 'MODERATE'}
              </span>
              <p style={{ ...SUB, margin: '8px 0 0' }}>Protect from sun damage</p>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: '0 0 2px' }}>Wear protective clothing</p>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: 0 }}>Best time to work: before 8am or after 5pm</p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: '2px 0 0' }}>ఉదయం 8 గంటల లోపు పని పూర్తి చేయండి</p>
              </div>
            </div>

            {/* Water Loss */}
            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>Water Loss</p>
              <p style={{ ...CTE, margin: '0 0 12px' }}>నీటి ఆవిరి</p>
              <p style={{ ...DV, color: '#dc2626', margin: 0 }}>{today.et0.toFixed(1)}</p>
              <p style={{ fontFamily: F.inter, fontSize: 12, color: '#dc2626', margin: '4px 0 6px' }}>mm / day</p>
              <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#dc2626', margin: '0 0 4px' }}>పంట నీరు వేగంగా ఆవిరవుతోంది</p>
              <p style={{ ...SUB, margin: 0 }}>Irrigate every 2 days</p>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: '0 0 2px' }}>
                  Your {plotSizeDisplay} field loses ~{Math.round(today.et0 * plotSize * 4046).toLocaleString()}L daily
                </p>
                <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: 0 }}>Next irrigation: Tomorrow morning</p>
                <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: '2px 0 0' }}>రేపు ఉదయం తడులు ఇవ్వండి</p>
              </div>
            </div>
          </div>

          {/* 7-Day Farm Forecast section */}
          <div>

            {/* Card A: 14-Day Strip */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,80,180,0.85) 0%, rgba(14,120,210,0.80) 50%, rgba(10,100,200,0.75) 100%)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: 12,
              border: '1px solid rgba(100,160,255,0.3)',
              boxShadow: '0 8px 32px rgba(30,80,180,0.3)'
            }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.dmSans, fontSize: 18, fontWeight: 600, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>14-Day Farm Forecast</h3>
                <p style={{ fontFamily: F.telugu, fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>14 రోజుల వాతావరణ అంచనా</p>
              </div>
              <div
                className="no-scrollbar"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  paddingBottom: '8px'
                }}
              >
                {wd.slice(0, 14).map((d, i) => {
                  const tMax = Math.round(d.temp_max || 0)
                  const tMin = Math.round(d.temp_min || 0)
                  const precip = d.precipitation || 0
                  const soilM = Math.round((d.soil_moisture || 0) * 100)

                  // Weather icon based on conditions:
                  // If precipitation > 10mm: Lucide CloudRain 24px #3b82f6
                  // If precipitation 2-10mm: Lucide Cloud 24px #94a3b8
                  // If temp_max > 40: Lucide Sun 24px #ff6b6b
                  // If temp_max 37-40: Lucide Sun 24px #ffd93d
                  // Else: Lucide Sun 24px #6bcb77
                  let weatherIcon = null
                  if (precip > 10) {
                    weatherIcon = <CloudRain size={24} color="#3b82f6" strokeWidth={2} />
                  } else if (precip >= 2) {
                    weatherIcon = <Cloud size={24} color="#94a3b8" strokeWidth={2} />
                  } else if (tMax > 40) {
                    weatherIcon = <Sun size={24} color="#ff6b6b" strokeWidth={2} />
                  } else if (tMax >= 37) {
                    weatherIcon = <Sun size={24} color="#ffd93d" strokeWidth={2} />
                  } else {
                    weatherIcon = <Sun size={24} color="#6bcb77" strokeWidth={2} />
                  }

                  // Max temp color based on temp:
                  // >40: #ff6b6b
                  // 37-40: #ffd93d
                  // <37: #6bcb77
                  let maxTempColor = '#6bcb77'
                  if (tMax > 40) {
                    maxTempColor = '#ff6b6b'
                  } else if (tMax >= 37) {
                    maxTempColor = '#ffd93d'
                  }

                  // Risk dot color:
                  // Red = CRITICAL day
                  // Amber = WARNING day
                  // Green = SAFE day
                  let riskColor = '#6bcb77'
                  if (tMax > 40) {
                    riskColor = '#ff6b6b'
                  } else if (tMax >= 37 || precip > 10 || soilM < 25) {
                    riskColor = '#ffd93d'
                  }

                  const isToday = i === 0
                  const isSelected = modalDay === i
                  const cardClass = (isToday || isSelected) ? 'weather-day-card selected-today' : 'weather-day-card'

                  const dayName = d.date 
                    ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }) 
                    : `D${i + 1}`

                  const dateStr = d.date 
                    ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : ''

                  return (
                    <div
                      key={i}
                      className={cardClass}
                      onClick={() => setModalDay(i)}
                    >
                      <span style={{ fontFamily: F.dmMono, fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        {dayName}
                      </span>
                      {dateStr && (
                        <span style={{ fontFamily: F.inter, fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                          {dateStr}
                        </span>
                      )}
                      <div style={{ margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {weatherIcon}
                      </div>
                      <span style={{ fontFamily: F.dmSans, fontSize: '18px', fontWeight: 600, color: maxTempColor }}>
                        {tMax}°
                      </span>
                      <span style={{ fontFamily: F.dmSans, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                        {tMin}°
                      </span>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riskColor, marginTop: '4px' }} />
                    </div>
                  )
                })}
              </div>
              <p style={{ fontFamily: F.inter, fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '10px 0 0', textAlign: 'center' }}>
                Click any day for detailed forecast
              </p>
            </div>

          </div>

          {/* CROP HEALTH — NASA MODIS NDVI/EVI/LST/LAI */}
          {(() => {
            const nd = backendData.ndvi || {
              ndvi: 0.52, ndvi_previous: 0.58, trend: -0.06, trend_direction: 'down',
              status: 'MODERATE', status_te: 'సాధారణ పంట ఆరోగ్యం', color: 'amber',
              cause_en: 'Slight decline — monitor for water stress',
              cause_te: 'కొంచెం తగ్గుతోంది — నీటి ఒత్తిడి గమనించండి',
              history: [0.71, 0.68, 0.65, 0.61, 0.58, 0.52],
              source: 'Estimated (satellite data temporarily unavailable)',
              evi: 0.31, lst_celsius: 38.5, lst_vs_air: 2.1, lai: 2.8,
              lai_optimal_min: 4.0, lai_optimal_max: 6.0,
            }

            const ndviColor = nd.status === 'HEALTHY' ? '#16a34a'
              : nd.status === 'MODERATE' ? '#f59e0b'
              : nd.status === 'STRESSED' ? '#f97316' : '#dc2626'

            const evi          = nd.evi ?? 0.31
            const lst          = nd.lst_celsius ?? 38.5
            const lstColor     = lst > 40 ? '#dc2626' : lst > 35 ? '#f59e0b' : '#16a34a'
            const lai          = nd.lai ?? 2.8
            const laiOptMin    = nd.lai_optimal_min ?? 3.0
            const laiOptMax    = nd.lai_optimal_max ?? 5.0
            const laiMaxScale  = 8
            const laiFillPct   = Math.min((lai / laiMaxScale) * 100, 100)
            const laiInRange   = lai >= laiOptMin && lai <= laiOptMax
            const laiNearRange = lai >= laiOptMin * 0.7
            const laiBarColor  = laiInRange ? '#16a34a' : laiNearRange ? '#f59e0b' : '#dc2626'
            const eviLabel     = evi > 0.4 ? 'Dense healthy canopy' : evi > 0.2 ? 'Moderate vegetation' : 'Sparse vegetation detected'
            const eviLabelTe   = evi > 0.4 ? 'దట్టమైన ఆరోగ్యకరమైన పచ్చదనం' : evi > 0.2 ? 'మధ్యస్థ వృక్షసంపద' : 'తక్కువ వృక్షసంపద గుర్తించబడింది'

            const C = { ...LIGHT_CARD, padding: 20 }
            const LBL = { fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#999', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.5px' }
            const LBL_TE = { fontFamily: F.telugu, fontSize: 11, color: '#bbb', margin: '0 0 10px' }
            const NUM = { fontFamily: F.dmSans, fontSize: 42, fontWeight: 700, margin: 0, lineHeight: 1, letterSpacing: '-1px' }
            const MONO_LBL = { fontFamily: F.dmMono, fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 10px' }
            const DIVIDER = { paddingTop: 10, borderTop: '1px solid #f1f5f9' }

            return (
              <div>

                {/* 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                  {/* Card 1 — NDVI: Crop Health Index */}
                  <div style={C}>
                    <p style={LBL}>Crop Health</p>
                    <p style={LBL_TE}>పంట ఆరోగ్యం</p>
                    <p style={{ ...NUM, color: ndviColor }}>{nd.ndvi.toFixed(3)}</p>
                    <p style={MONO_LBL}>NDVI Score</p>
                    <span style={{
                      display: 'inline-block',
                      fontFamily: F.inter, fontSize: 11, fontWeight: 600,
                      background: `${ndviColor}18`, color: ndviColor,
                      border: `1px solid ${ndviColor}50`,
                      borderRadius: 100, padding: '3px 10px',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {nd.status}
                    </span>
                    <p style={{ fontFamily: F.telugu, fontSize: 11, color: ndviColor, margin: '5px 0 0' }}>
                      {nd.status_te}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                      {nd.trend_direction === 'up'
                        ? <TrendingUp size={14} color="#16a34a" strokeWidth={2} />
                        : <TrendingDown size={14} color="#dc2626" strokeWidth={2} />
                      }
                      <span style={{ fontFamily: F.dmMono, fontSize: 10, color: nd.trend > 0 ? '#16a34a' : '#dc2626' }}>
                        {nd.trend > 0 ? '+' : ''}{nd.trend.toFixed(3)} vs last reading
                      </span>
                    </div>
                  </div>

                  {/* Card 2 — EVI: Vegetation Vigor */}
                  <div style={C}>
                    <p style={LBL}>Vegetation Vigor</p>
                    <p style={LBL_TE}>వృక్షసంపద తీవ్రత</p>
                    <p style={{ ...NUM, color: '#8b5cf6' }}>{evi.toFixed(3)}</p>
                    <p style={MONO_LBL}>EVI Index</p>
                    <div style={DIVIDER}>
                      <p style={{ fontFamily: F.inter, fontSize: 12, color: '#555', margin: '0 0 3px', lineHeight: 1.5 }}>
                        {eviLabel}
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: 0 }}>
                        {eviLabelTe}
                      </p>
                    </div>
                  </div>

                  {/* Card 3 — LST: Ground Temperature */}
                  <div style={C}>
                    <p style={LBL}>Ground Temperature</p>
                    <p style={LBL_TE}>నేల ఉష్ణోగ్రత</p>
                    <p style={{ ...NUM, color: lstColor }}>
                      {lst.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 500 }}>°C</span>
                    </p>
                    <p style={MONO_LBL}>Land Surface</p>
                    <div style={DIVIDER}>
                      {nd.lst_vs_air != null ? (
                        <>
                          <p style={{ fontFamily: F.inter, fontSize: 12, color: '#666', margin: '0 0 3px' }}>
                            Air temp: {(lst - nd.lst_vs_air).toFixed(1)}°C
                          </p>
                          <p style={{ fontFamily: F.inter, fontSize: 12, fontWeight: 500, color: nd.lst_vs_air > 0 ? '#dc2626' : '#16a34a', margin: '0 0 4px' }}>
                            {nd.lst_vs_air > 0 ? `+${nd.lst_vs_air}°C heat stress` : `${nd.lst_vs_air}°C cooler than air`}
                          </p>
                        </>
                      ) : (
                        <p style={{ fontFamily: F.inter, fontSize: 12, color: '#999', margin: '0 0 4px' }}>Air comparison unavailable</p>
                      )}
                      <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: 0 }}>
                        {lst > 40 ? 'నేల అధికంగా వేడెక్కింది' : lst > 35 ? 'నేల వేడిగా ఉంది' : 'నేల ఉష్ణోగ్రత సాధారణం'}
                      </p>
                    </div>
                  </div>

                  {/* Card 4 — LAI: Canopy Density */}
                  <div style={C}>
                    <p style={LBL}>Canopy Density</p>
                    <p style={LBL_TE}>పచ్చదనం సాంద్రత</p>
                    <p style={{ ...NUM, color: '#3b82f6' }}>{lai.toFixed(2)}</p>
                    <p style={MONO_LBL}>LAI Index</p>
                    {/* Progress bar */}
                    <div style={{ position: 'relative', background: '#e5e7eb', height: 6, borderRadius: 3, marginBottom: 6 }}>
                      <div style={{
                        position: 'absolute',
                        left: `${(laiOptMin / laiMaxScale) * 100}%`,
                        width: `${((laiOptMax - laiOptMin) / laiMaxScale) * 100}%`,
                        top: 0, bottom: 0,
                        background: 'rgba(22,163,74,0.25)',
                        borderRadius: 3,
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0, top: 0, bottom: 0,
                        width: `${laiFillPct}%`,
                        background: laiBarColor,
                        borderRadius: 3,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <p style={{ fontFamily: F.inter, fontSize: 11, color: '#999', margin: '0 0 6px' }}>
                      Optimal: {laiOptMin.toFixed(1)}–{laiOptMax.toFixed(1)} for {backendData.selected_crop || 'your crop'}
                    </p>
                    <p style={{ fontFamily: F.inter, fontSize: 12, fontWeight: 500, color: laiBarColor, margin: '0 0 3px' }}>
                      {laiInRange ? 'Within optimal range' : laiNearRange ? 'Below optimal — needs attention' : 'Critically low canopy'}
                    </p>
                    <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: 0 }}>
                      {laiInRange ? 'అనుకూలమైన పరిధిలో ఉంది' : laiNearRange ? 'అనుకూలమైన దానికంటే తక్కువ' : 'తీవ్రంగా తక్కువ పచ్చదనం'}
                    </p>
                  </div>

                </div>

                {/* Interpretation box — solid white card with status border */}
                <div style={{
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: 16,
                  padding: '16px 20px',
                  borderLeft: `4px solid ${ndviColor}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}>
                  {nd.status === 'HEALTHY' && (
                    <>
                      <p style={{ fontFamily: F.inter, fontSize: 13, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.5 }}>
                        Your crop is in excellent health. Satellite imagery shows dense, active vegetation.
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#444444', margin: 0 }}>
                        మీ పంట అద్భుతమైన ఆరోగ్యంలో ఉంది.
                      </p>
                    </>
                  )}
                  {nd.status === 'MODERATE' && (
                    <>
                      <p style={{ fontFamily: F.inter, fontSize: 13, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.5 }}>
                        Your crop shows moderate health. Monitor for early stress signs and ensure adequate irrigation.
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#444444', margin: 0 }}>
                        మీ పంట సాధారణ ఆరోగ్యంలో ఉంది.
                      </p>
                    </>
                  )}
                  {nd.status === 'STRESSED' && (
                    <>
                      <p style={{ fontFamily: F.inter, fontSize: 13, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.5 }}>
                        Crop stress detected from satellite. Immediate irrigation recommended. Check for pest or disease damage.
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#444444', margin: 0 }}>
                        ఉపగ్రహం నుండి పంట ఒత్తిడి గుర్తించబడింది.
                      </p>
                    </>
                  )}
                  {nd.status === 'CRITICAL' && (
                    <>
                      <p style={{ fontFamily: F.inter, fontSize: 13, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.5 }}>
                        Critical crop stress detected. Urgent action required. Contact your agriculture officer.
                      </p>
                      <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#444444', margin: 0 }}>
                        విమర్శనాత్మక పంట ఒత్తిడి గుర్తించబడింది.
                      </p>
                    </>
                  )}
                </div>

              </div>
            )
          })()}

          {/* Crop Water Requirement Card */}
          {backendData.water_requirement && (
            <div style={{
              ...LIGHT_CARD,
              padding: 24,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Droplets size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontFamily: F.inter, fontSize: '15px', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>Crop Water Requirement</h4>
                    <p style={{ fontFamily: F.telugu, fontSize: '12px', color: '#999', margin: '2px 0 0' }}>పంట నీటి అవసరం</p>
                  </div>
                </div>
                <span style={{
                  fontFamily: F.dmMono,
                  fontSize: '10px',
                  color: '#3b82f6',
                  background: 'rgba(59,130,246,0.1)',
                  borderRadius: '100px',
                  padding: '2px 8px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  FAO Standard
                </span>
              </div>

              {/* TOP SECTION — TODAY'S NEED */}
              <div className="grid grid-cols-3 gap-3">
                {/* Box 1 — Water Needed */}
                <div style={{ ...SOFT_CARD, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Droplets size={16} color="#3b82f6" />
                    <span style={{ fontFamily: F.dmMono, fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TODAY'S NEED</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: F.dmSans, fontSize: '32px', color: '#3b82f6', fontWeight: 700 }}>
                      {Math.round((backendData.water_requirement.today_litres_needed) / 100) * 100}
                    </span>
                    <span style={{ fontFamily: F.dmMono, fontSize: '12px', color: '#999', marginLeft: '4px' }}>litres</span>
                  </div>
                  <span style={{ fontFamily: F.inter, fontSize: '11px', color: '#666' }}>
                    for your {plotSizeDisplay} field
                  </span>
                </div>

                {/* Box 2 — Rain Contribution */}
                <div style={{ ...SOFT_CARD, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CloudRain size={16} color={backendData.water_requirement.today_rain_mm > 0 ? '#16a34a' : '#dc2626'} />
                    <span style={{ fontFamily: F.dmMono, fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RAIN TODAY</span>
                  </div>
                  {backendData.water_requirement.today_rain_mm > 0 ? (
                    <>
                      <div>
                        <span style={{ fontFamily: F.dmSans, fontSize: '32px', color: '#16a34a', fontWeight: 700 }}>
                          {Math.round((backendData.water_requirement.today_rain_mm * 4046.86 * plotSize) / 100) * 100}
                        </span>
                        <span style={{ fontFamily: F.dmMono, fontSize: '12px', color: '#999', marginLeft: '4px' }}>litres</span>
                      </div>
                      <span style={{ fontFamily: F.inter, fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
                        {`${Math.round((backendData.water_requirement.today_rain_mm * 4046.86 * plotSize) / 100) * 100} litres from rain`}
                      </span>
                    </>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontFamily: F.dmSans, fontSize: '32px', color: '#dc2626', fontWeight: 700 }}>
                          0
                        </span>
                        <span style={{ fontFamily: F.dmMono, fontSize: '12px', color: '#999', marginLeft: '4px' }}>litres</span>
                      </div>
                      <span style={{ fontFamily: F.inter, fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>
                        No rain today
                      </span>
                    </>
                  )}
                </div>

                {/* Box 3 — Net Irrigation */}
                <div style={{ ...SOFT_CARD, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowDown size={16} color="#f59e0b" />
                    <span style={{ fontFamily: F.dmMono, fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NET IRRIGATION</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: F.dmSans, fontSize: '32px', color: '#f59e0b', fontWeight: 700 }}>
                      {Math.round((backendData.water_requirement.today_net_irrigation_mm * 4046.86 * plotSize) / 100) * 100}
                    </span>
                    <span style={{ fontFamily: F.dmMono, fontSize: '12px', color: '#999', marginLeft: '4px' }}>litres to add</span>
                  </div>
                  <span style={{ fontFamily: F.inter, fontSize: '11px', color: '#666' }}>
                    {backendData.water_requirement.irrigation_frequency}
                  </span>
                </div>
              </div>

              {/* MIDDLE SECTION — 7-DAY BREAKDOWN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: F.inter, fontSize: '13px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  7-Day Water Schedule
                </p>
                
                {/* Scrollable Bar Chart */}
                <div style={{
                  overflowX: 'auto',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '16px 8px 8px',
                  background: '#fafafa',
                  borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  minHeight: 180
                }} className="no-scrollbar">
                  {backendData.water_requirement.daily_breakdown.slice(0, 7).map((day, idx) => {
                    const maxWater = Math.max(...backendData.water_requirement.daily_breakdown.slice(0, 7).map(d => d.water_needed_mm), 0.1);
                    const heightPct = (day.water_needed_mm / maxWater) * 100;
                    const barHeight = Math.max(6, heightPct * 0.9); // max 90px

                    let barColor = '#cbd5e1'; // Grey
                    if (day.irrigation_needed) {
                      barColor = '#3b82f6'; // Blue
                    } else if (day.water_needed_mm > 0) {
                      barColor = '#16a34a'; // Green (rain covers requirement)
                    }

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        minWidth: 50,
                        gap: 8
                      }}>
                        <div style={{
                          width: 16,
                          height: `${barHeight}px`,
                          background: barColor,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }} />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontFamily: F.dmMono, fontSize: '10px', color: '#1a1a1a', fontWeight: 500 }}>
                            {day.day}
                          </span>
                          <span style={{ fontFamily: F.inter, fontSize: '10px', color: '#666', fontWeight: 500 }}>
                            {day.irrigation_needed ? `${Math.round(day.litres_needed).toLocaleString()}L` : '0L'}
                          </span>
                          <span style={{ fontFamily: F.inter, fontSize: '10px', color: '#999', whiteSpace: 'nowrap' }}>
                            {day.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTTOM SECTION — SMART ADVICE */}
              {(() => {
                const freqTeMap = {
                  "Daily": "ప్రతి రోజు",
                  "Every 2 days": "ప్రతి 2 రోజులకు",
                  "Every 3 days": "ప్రతి 3 రోజులకు",
                  "Weekly": "వారానికి ఒకసారి"
                };
                const freqTe = freqTeMap[backendData.water_requirement.irrigation_frequency] || "వారానికి ఒకసారి";
                
                return (
                  <div style={{
                    background: 'rgba(59,130,246,0.06)',
                    borderLeft: '4px solid #3b82f6',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    {/* Advice 1 — Time */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Clock size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>
                          Best irrigation time: {backendData.water_requirement.best_irrigation_time}
                        </p>
                        <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#666', margin: '2px 0 0' }}>
                          ఉత్తమ నీటిపారుదల సమయం: ఉదయం 6 గంటలు
                        </p>
                      </div>
                    </div>

                    {/* Advice 2 — Frequency */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Calendar size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>
                          Irrigation frequency: {backendData.water_requirement.irrigation_frequency}
                        </p>
                        <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#666', margin: '2px 0 0' }}>
                          నీటిపారుదల పౌనఃపున్యం: {freqTe}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

            {/* Card B: Incoming Alerts */}
            <div style={{ ...LIGHT_CARD, padding: '20px 24px', marginBottom: 12 }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>Incoming Alerts</p>
              <p style={{ ...CTE, margin: '0 0 16px' }}>రాబోయే హెచ్చరికలు</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alertEvents.map((evt, i) => {
                  const s = SEV[evt.sev] || SEV.ADVISORY
                  return (
                    <div key={i} onClick={() => setModalDay(evt.idx)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i < alertEvents.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 100, background: s.text }} />
                        {i < alertEvents.length - 1 && <div style={{ width: 2, height: 32, background: '#f1f5f9', marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: F.inter, fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '0 0 2px' }}>Day {evt.day} — {evt.title}</p>
                        <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#666', margin: 0 }}>{evt.te}</p>
                        <p style={{ fontFamily: F.inter, fontSize: 11, color: '#999', margin: '2px 0 0' }}>{evt.desc}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <RVBadge severity={evt.sev} />
                        <p style={{ fontFamily: F.dmMono, fontSize: 11, color: '#999', margin: '4px 0 0' }}>in {evt.day} day{evt.day === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card C: Best Days to Act */}
            <div style={{ ...LIGHT_CARD, padding: '20px 24px' }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>Best Days to Act</p>
              <p style={{ ...CTE, margin: '0 0 16px' }}>చర్య తీసుకోవడానికి మంచి రోజులు</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { Icon: Droplets, color: '#3b82f6', label: 'Best irrigation days', te: 'సాగు నీటికి అనుకూలమైన రోజులు', days: irrigDays.length > 0 ? irrigDays.slice(0, 3).join(', ') : 'All days viable', badge: 'DO NOW', badgeColor: '#16a34a', badgeBg: '#f0fdf4', badgeBorder: '#bbf7d0', dayIdx: irrigDays.length > 0 ? parseInt(irrigDays[0].replace('D', '')) - 1 : 0 },
                  { Icon: Wind, color: '#8b5cf6', label: 'Safe for spraying', te: 'పిచికారీకి సురక్షితమైన రోజులు', days: sprayDays.length > 0 ? `${sprayDays.slice(0, 3).join(', ')} (low wind)` : 'Avoid this week', badge: 'PLAN AHEAD', badgeColor: '#2563eb', badgeBg: '#eff6ff', badgeBorder: '#bfdbfe', dayIdx: sprayDays.length > 0 ? parseInt(sprayDays[0].replace('D', '')) - 1 : 0 },
                  { Icon: Leaf, color: '#16a34a', label: 'Avoid fertiliser', te: 'ఎరువులు వేయవద్దు', days: avoidFertDays.length > 0 ? `${avoidFertDays.join(', ')} (heatwave)` : 'All days OK', badge: avoidFertDays.length > 0 ? 'AVOID' : 'ALL CLEAR', badgeColor: avoidFertDays.length > 0 ? '#dc2626' : '#16a34a', badgeBg: avoidFertDays.length > 0 ? '#fef2f2' : '#f0fdf4', badgeBorder: avoidFertDays.length > 0 ? '#fecaca' : '#bbf7d0', dayIdx: avoidFertDays.length > 0 ? parseInt(avoidFertDays[0].replace('D', '')) - 1 : 0 },
                  { Icon: Sun, color: '#f59e0b', label: 'Harvest window', te: 'కోత సమయం', days: harvestWindow, badge: harvestWindow !== 'Not in forecast' ? 'UPCOMING' : 'NOT YET', badgeColor: '#d97706', badgeBg: '#fffbeb', badgeBorder: '#fde68a', dayIdx: 9 },
                ].map(({ Icon, color, label, te, days, badge, badgeColor, badgeBg, badgeBorder, dayIdx }, i) => (
                  <div key={i} onClick={() => setModalDay(Math.min(dayIdx, wd.length - 1))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                    <Icon size={18} color={color} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: '0 0 1px' }}>{label}</p>
                      <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: '0 0 1px' }}>{te}</p>
                      <p style={{ fontFamily: F.inter, fontSize: 11, color: '#666', margin: 0 }}>{days}</p>
                    </div>
                    <span style={{ flexShrink: 0, fontFamily: F.inter, fontSize: 10, fontWeight: 600, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, borderRadius: 100, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>


          {/* ROW 4 — Risk Overview */}
          <div style={{ ...LIGHT_CARD, padding: 24 }}>
            <p style={{ ...CT, margin: '0 0 2px' }}>Risk Overview</p>
            <p style={{ ...CTE, margin: '0 0 16px' }}>ప్రమాద సారాంశం</p>
            <div className="grid grid-cols-2 gap-3">
              {risks.map(({ Icon, en, te, sev }) => {
                const s = SEV[sev]
                return (
                  <div key={en} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', borderRadius: 12, padding: '10px 14px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={15} color={s.text} strokeWidth={2} />
                      <div>
                        <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{en}</p>
                        <p style={{ fontFamily: F.telugu, fontSize: 11, color: '#999', margin: 0 }}>{te}</p>
                      </div>
                    </div>
                    <RVBadge severity={sev} />
                  </div>
                )
              })}
            </div>
          </div>


          {/* ROW 6 — Map + Historical */}
          <div className="grid grid-cols-2 gap-4">

            <div style={{ ...LIGHT_CARD, padding: 24, overflow: 'hidden' }}>
              <p style={{ ...CT, margin: '0 0 10px' }}>
                Farm Location{' '}
                <span style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', fontWeight: 400 }}>/ పొలం స్థానం</span>
              </p>
              <div style={{ height: 175, borderRadius: 12, overflow: 'hidden' }}>
                <MapContainer center={center} zoom={14} zoomControl={false}
                  dragging={false} doubleClickZoom={false} scrollWheelZoom={false}
                  boxZoom={false} keyboard={false} touchZoom={false}
                  style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
                  {location && <Marker position={center} icon={greenPin} />}
                </MapContainer>
              </div>
            </div>

            <div style={{ ...LIGHT_CARD, padding: 24 }}>
              <p style={{ ...CT, margin: '0 0 2px' }}>vs 30-Year Average</p>
              <p style={{ ...CTE, margin: '0 0 18px' }}>30 సంవత్సరాల సగటుతో పోలిక</p>
              {historical.map(({ lbl, te, val, c }, i) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: i < historical.length - 1 ? 14 : 0 }}>
                  <div>
                    <p style={{ fontFamily: F.inter, fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{lbl}</p>
                    <p style={{ fontFamily: F.telugu, fontSize: 12, color: '#999', margin: '2px 0 0' }}>{te}</p>
                  </div>
                  <span style={{ fontFamily: F.inter, fontSize: 12, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}50`, borderRadius: 8, padding: '3px 10px' }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      <AnimatePresence>
        {modalDay !== null && (
          <ForecastModal
            day={modalDay}
            wd={wd}
            selectedCrop={selectedCrop}
            cropStage={cropStage}
            stageInfo={stageInfo}
            onClose={() => setModalDay(null)}
            onPrev={() => setModalDay(d => Math.max(0, d - 1))}
            onNext={() => setModalDay(d => Math.min(wd.length - 1, d + 1))}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
