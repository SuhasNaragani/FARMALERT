import asyncio
import json
import logging
import os
import time
from typing import List
import google.generativeai as genai
from app.config import settings
from app.models import ActionPlan, ActionItem, FarmSummary, SummarySectionItem, DailyWeatherItem, RiskItem

logger = logging.getLogger("farmalert.gemini")

# ── Cached model name — set once by get_working_model() ──────────────────────
_DETECTED_MODEL: str | None = None

def get_working_model():
    global _DETECTED_MODEL

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    genai.configure(api_key=api_key)

    try:
        available = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available.append(m.name)
                print(f"Found model: {m.name}")

        if not available:
            print("No models available")
            return None

        preferred = [
            "models/gemini-2.0-flash-lite",
            "models/gemini-2.0-flash",
            "models/gemini-flash-lite-latest",
            "models/gemini-flash-latest",
        ]

        for model_name in preferred:
            if model_name in available:
                try:
                    model = genai.GenerativeModel(model_name)
                    model.generate_content("Hi")
                    print(f"Using model: {model_name}")
                    _DETECTED_MODEL = model_name
                    return model_name
                except Exception as e:
                    print(f"Model {model_name} failed: {e}")
                    continue

        # Nothing in preferred list worked — fall back to first available
        print(f"Preferred models unavailable, falling back to: {available[0]}")
        _DETECTED_MODEL = available[0]
        return available[0]

    except Exception as e:
        print(f"Error listing models: {e}")
        return None

# ── Estimated crop age ranges per stage (days after sowing/planting) ──────────
STAGE_AGE_MAP: dict[str, dict[str, str]] = {
    "paddy":    {"nursery": "0–21", "transplanting": "21–30", "tillering": "30–60",
                 "flowering": "60–90", "grain_filling": "90–110", "harvest": "110–130"},
    "cotton":   {"germination": "0–15", "vegetative": "15–45", "flowering": "45–75",
                 "boll_formation": "75–110", "harvest": "110–160"},
    "chilli":   {"seedling": "0–30", "vegetative": "30–60", "flowering": "60–90",
                 "fruiting": "90–120", "harvest": "120–150"},
    "soybean":  {"germination": "0–10", "vegetative": "10–35", "flowering": "35–60",
                 "pod_filling": "60–90", "harvest": "90–110"},
    "turmeric": {"planting": "0–30", "vegetative": "30–90",
                 "rhizome_dev": "90–180", "harvest": "180–270"},
}

# ── Stage-specific today action overrides for template fallback ────────────────
_AI = ActionItem  # shorthand
STAGE_TODAY_OVERRIDES: dict[str, dict[str, list]] = {
    "paddy": {
        "nursery": [
            _AI(icon_type="check",   en="Water nursery bed twice daily (early morning and evening) to maintain seedling moisture",           te="నారు తేమ నిలుపుకోవడానికి ఉదయం మరియు సాయంత్రం రోజుకు రెండుసార్లు నారుమడికి నీళ్ళు పెట్టండి"),
            _AI(icon_type="check",   en="Apply 4g/sqm urea to nursery 10 days after sowing to boost early growth",                          te="మొలకెత్తిన 10 రోజుల తర్వాత చ.మీ.కు 4 గ్రాముల యూరియా వేసి మొక్కల ప్రాథమిక పెరుగుదలను వేగవంతం చేయండి"),
            _AI(icon_type="warning", en="Watch for blast disease on nursery leaves — spray Tricyclazole at first spots",                     te="నారు ఆకులపై బ్లాస్ట్ తెగులు గమనిస్తే వెంటనే ట్రైసైక్లజోల్ పిచికారీ చేయండి"),
        ],
        "transplanting": [
            _AI(icon_type="check",   en="Transplant seedlings in rows at 20×15 cm spacing for best tillering potential",                    te="ఉత్తమ పిలక వృద్ధికి 20×15 సెం.మీ దూరంలో వరుసల్లో నారు నాటండి"),
            _AI(icon_type="check",   en="Maintain 2–3 cm shallow water for 7 days after transplanting to reduce seedling shock",            te="నారు ఒత్తిడి తగ్గించడానికి నాటిన తర్వాత 7 రోజులు 2–3 సెం.మీ నీటి పొర నిలుపుకోండి"),
            _AI(icon_type="warning", en="Avoid transplanting between 11am–3pm — transplant only in early morning or evening",               te="మధ్యాహ్న వేళ (11–3 గంటలు) నాటడం మానుకోండి — ఉదయమే లేదా సాయంత్రం నాటండి"),
        ],
        "tillering": [
            _AI(icon_type="check",   en="Maintain 5 cm water depth during tillering to support tiller emergence",                          te="పిలక దశలో 5 సెం.మీ నీటి లోతు నిలుపుకుని పిలకలు బాగా వేసేలా చేయండి"),
            _AI(icon_type="check",   en="Apply split dose of 25 kg/acre urea to boost tiller count at this stage",                         te="పిలక సంఖ్య పెంచడానికి ఎకరాకు 25 కి.గ్రా. యూరియా విడత వేయండి"),
            _AI(icon_type="warning", en="Wet tillering conditions attract brown planthopper — scout fields daily",                          te="తేమతో కూడిన పిలక దశ గోధుమ రంగు ఈక పురుగులను ఆకర్షిస్తుంది — ప్రతిరోజూ పొలాన్ని పరిశీలించండి"),
        ],
        "flowering": [
            _AI(icon_type="warning", en="Heatwave during flowering causes spikelet sterility — irrigate at 6am and 6pm",                   te="పూత దశలో వేడి తరంగం వల్ల పిలకలు నిస్సారమవుతాయి — ఉదయం 6 మరియు సాయంత్రం 6 గంటలకు నీళ్ళు పెట్టండి"),
            _AI(icon_type="check",   en="Spray 2% KNO3 foliar solution to reduce heat stress during active pollination",                   te="పరాగ సంపర్కం సమయంలో వేడి ఒత్తిడి తగ్గించడానికి 2% KNO3 ఆకుపై పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Maintain a 5 cm water layer to buffer soil temperature at critical flowering",                    te="పూత దశలో నేల ఉష్ణోగ్రత నియంత్రించడానికి పొలంలో 5 సెం.మీ నీటి పొరను నిలుపుకోండి"),
        ],
        "grain_filling": [
            _AI(icon_type="check",   en="Irrigate every 2 days during grain filling to prevent chalky, low-quality grains",                te="పాలు నిండే దశలో రెండు రోజులకొకసారి నీళ్ళు పెట్టి గింజలు పాడు కాకుండా కాపాడండి"),
            _AI(icon_type="warning", en="Monitor for neck blast disease — spray Tricyclazole immediately at first symptoms",                te="కంకి తెగులు వస్తే వెంటనే ట్రైసైక్లజోల్ పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Reduce nitrogen applications now — excess N causes lodging at grain fill stage",                  te="ఇప్పుడు నత్రజని తగ్గించండి — అధిక N వల్ల పొట్ట దశలో పంట పడిపోవచ్చు"),
        ],
        "harvest": [
            _AI(icon_type="check",   en="Drain field 10 days before harvest to firm up soil for machinery access",                         te="యంత్రాలు సులభంగా పని చేసేందుకు కోత 10 రోజుల ముందు పొలం నుండి నీరు తీసివేయండి"),
            _AI(icon_type="check",   en="Harvest when 80% of grains are golden-yellow to minimise shattering loss",                       te="80% గింజలు బంగారు పసుపు రంగులో ఉన్నప్పుడు కోస్తే గింజలు రాలే నష్టం తగ్గుతుంది"),
            _AI(icon_type="warning", en="Check the weather window before harvest — avoid cutting before expected rain days",                te="కోత ముందు వాతావరణ అంచనా తనిఖీ చేయండి — వర్షం పడే రోజులకు ముందు కోత చేయకండి"),
        ],
    },
    "cotton": {
        "germination": [
            _AI(icon_type="check",   en="Keep soil at field capacity to support uniform germination — avoid over-irrigation",              te="ఏకరీతి మొలకెత్తడం కోసం నేల తేమను పొలం సామర్థ్యంలో నిలుపుకోండి — అధిక నీళ్ళు వేయకండి"),
            _AI(icon_type="check",   en="Sow seeds at 3–4 cm depth — shallow furrows prevent heat damage to germinating seeds",           te="3–4 సెం.మీ లోతులో విత్తండి — తక్కువ లోతు వేడి నుండి మొలకను కాపాడుతుంది"),
            _AI(icon_type="warning", en="Watch for damping-off fungal disease under wet and warm germination conditions",                  te="తేమ మరియు వేడి పరిస్థితుల్లో పాదం కుళ్ళు శిలీంధ్ర తెగుల కోసం నిఘా పెట్టండి"),
        ],
        "flowering": [
            _AI(icon_type="warning", en="Heat above 38°C during cotton flowering causes boll drop — irrigate in the evening",             te="పూత దశలో 38°C కంటే ఎక్కువ వేడి వల్ల గూళ్ళు రాలతాయి — సాయంత్రం నీళ్ళు పెట్టండి"),
            _AI(icon_type="check",   en="Spray 0.5% boric acid to improve boll set during peak flowering",                                te="అత్యధిక పూత సమయంలో గూళ్ళు నిలబడడానికి 0.5% బోరాన్ పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Monitor for pink bollworm egg masses on fresh flowers and small bolls",                          te="కొత్త పూలపై మరియు చిన్న గూళ్ళపై గులాబీ కాయ పురుగు గుడ్లను గమనించండి"),
        ],
        "boll_formation": [
            _AI(icon_type="check",   en="Irrigate every 5 days during boll filling to prevent premature boll opening",                    te="గూళ్ళు ముందుగా తెరుచుకోకుండా నిరోధించడానికి గూళ్ళు నిండే దశలో ఐదు రోజులకొకసారి నీళ్ళు పెట్టండి"),
            _AI(icon_type="warning", en="Bollworm pressure peaks now — spray Bt or neem oil at first signs of damage",                    te="ఈ దశలో కాయ పురుగు తీవ్రంగా ఉంటుంది — నష్టం కనిపిస్తే వెంటనే Bt లేదా వేప నూనె పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Apply 20 kg/acre potash to strengthen boll walls and prevent early splitting",                   te="గూళ్ళు పటిష్టంగా నిలబడడానికి ఎకరాకు 20 కి.గ్రా. పొటాష్ వేయండి"),
        ],
    },
    "chilli": {
        "flowering": [
            _AI(icon_type="warning", en="High temperature during chilli flowering causes flower drop — irrigate at dawn and dusk",         te="మిర్చి పూత దశలో అధిక ఉష్ణోగ్రత పూలను రాల్చుతుంది — తెల్లవారుజామున మరియు సాయంత్రం నీళ్ళు పెట్టండి"),
            _AI(icon_type="check",   en="Spray 0.2% boric acid to improve fruit set under heat stress",                                   te="వేడి ఒత్తిడిలో కాయ నిలుపుదల మెరుగుపరచడానికి 0.2% బోరిక్ యాసిడ్ పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Set up yellow sticky traps for thrips management — thrips damage is highest at flowering",        te="పూత దశలో తామర పురుగుల నష్టం ఎక్కువగా ఉంటుంది — పసుపు జిగురు అట్టలు అమర్చండి"),
        ],
        "fruiting": [
            _AI(icon_type="check",   en="Irrigate every 4 days during fruit development to prevent cracking and colour loss",             te="కాయలు పగలకుండా మరియు రంగు పోకుండా నాలుగు రోజులకొకసారి నీళ్ళు పెట్టండి"),
            _AI(icon_type="warning", en="Fruit borer becomes active at this stage — install pheromone traps immediately",                  te="ఈ దశలో కాయతొలిచే పురుగు చురుకుగా ఉంటుంది — వెంటనే ఫెరోమోన్ ఉచ్చులు ఏర్పాటు చేయండి"),
            _AI(icon_type="check",   en="Spray calcium and boron foliar solution to strengthen fruit cell walls",                         te="కాయ గోడలు పటిష్టంగా ఉండేందుకు కాల్షియం మరియు బోరాన్ ఆకు పిచికారీ చేయండి"),
        ],
    },
    "soybean": {
        "flowering": [
            _AI(icon_type="check",   en="Moisture stress at flowering reduces pod set by 40% — maintain adequate soil moisture",           te="పూత దశలో నీటి ఒత్తిడి పొట్ల సంఖ్యను 40% తగ్గిస్తుంది — తగిన నేల తేమ నిలుపుకోండి"),
            _AI(icon_type="warning", en="Monitor for stem fly and girdle beetle at early flowering stage",                                 te="పూత ప్రారంభంలో కాండం ఈగ మరియు నారు పురుగులను నిఘా పెట్టండి"),
            _AI(icon_type="check",   en="Avoid tillage or weeding operations during active flowering — root disturbance reduces yield",    te="పూత పూర్తయ్యే వరకు దుక్కి లేదా కలుపు తీత మానుకోండి — వేరు అశాంతి దిగుబడి తగ్గిస్తుంది"),
        ],
        "pod_filling": [
            _AI(icon_type="check",   en="Irrigate every 5 days during pod filling — drought at this stage cuts yield by up to 50%",       te="పొట్లాలు నిండే దశలో ఐదు రోజులకొకసారి నీళ్ళు పెట్టండి — ఈ దశలో కరువు 50% వరకు దిగుబడి తగ్గిస్తుంది"),
            _AI(icon_type="warning", en="Pod borer damage peaks at this stage — spray Chlorpyrifos at first sign of entry holes",         te="ఈ దశలో పొట్ల పురుగు నష్టం ఎక్కువగా ఉంటుంది — రంధ్రాలు కనిపిస్తే క్లోర్పైరిఫాస్ పిచికారీ చేయండి"),
            _AI(icon_type="check",   en="Apply 0.5% MgSO4 foliar spray to support seed development and protein content",                  te="గింజ అభివృద్ధి మరియు ప్రోటీన్ శాతానికి 0.5% MgSO4 ఆకు పిచికారీ చేయండి"),
        ],
    },
    "turmeric": {
        "rhizome_dev": [
            _AI(icon_type="check",   en="Irrigate every 7–10 days during rhizome development — regular moisture is critical",             te="దుంప అభివృద్ధి దశలో 7–10 రోజులకొకసారి నీళ్ళు పెట్టండి — నిరంతర తేమ అత్యవసరం"),
            _AI(icon_type="check",   en="Apply earthing-up (hilling) to cover developing rhizomes and prevent sunscald",                  te="పెరుగుతున్న దుంపలను ఎండ మాడకుండా కాపాడటానికి మట్టి కప్పండి"),
            _AI(icon_type="warning", en="Check for rhizome rot — infected plants show yellowing leaves and soft, foul-smelling stems",    te="దుంప కుళ్ళు గమనించండి — సోకిన మొక్కలు పసుపు ఆకులు మరియు మెత్తని కాండం చూపిస్తాయి"),
        ],
        "harvest": [
            _AI(icon_type="check",   en="Stop irrigation 3 weeks before harvest to let rhizomes cure and mature properly",                te="దుంపలు పక్వానికి వచ్చేందుకు కోత 3 వారాల ముందు నీళ్ళు ఆపండి"),
            _AI(icon_type="check",   en="Harvest when leaves yellow and dry at 8–9 months — do not delay to avoid rhizome quality loss",  te="ఆకులు పసుపు పడినప్పుడు (8–9 నెలలు) కోత చేయండి — ఆలస్యం చేస్తే దుంప నాణ్యత తగ్గుతుంది"),
            _AI(icon_type="warning", en="Handle harvested rhizomes gently — bruising causes rapid post-harvest rot",                      te="కోసిన దుంపలు జాగ్రత్తగా నిర్వహించండి — గాయాలైన దుంపలు త్వరగా కుళ్ళిపోతాయి"),
        ],
    },
}

# ── Soil-type irrigation guidance (one-liner for recommendation suffix) ────────
SOIL_IRRIGATION_NOTES: dict[str, dict[str, str]] = {
    "Black Cotton Soil": {
        "en": "Holds water well — irrigate every 4-5 days. Avoid waterlogging.",
        "te": "నీరు బాగా నిలుపుతుంది — 4-5 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Red Sandy Soil": {
        "en": "Drains fast — irrigate every 2-3 days. Apply mulching.",
        "te": "త్వరగా ఆరిపోతుంది — 2-3 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Loamy Soil": {
        "en": "Good retention — irrigate every 3-4 days. Ideal for most crops.",
        "te": "మంచి నీటి నిలుపుదల — 3-4 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Clay Soil": {
        "en": "Heavy soil — irrigate every 5-7 days. Ensure proper drainage.",
        "te": "బరువైన నేల — 5-7 రోజులకు నీళ్ళు పెట్టండి. నీటి పారుదల నిర్ధారించండి."
    },
    "Sandy Soil": {
        "en": "Very fast drainage — irrigate daily or every 2 days.",
        "te": "చాలా త్వరగా ఆరిపోతుంది — రోజూ లేదా 2 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Laterite Soil": {
        "en": "Moderate drainage — irrigate every 3-4 days. Add organic matter.",
        "te": "మధ్యస్థ పారుదల — 3-4 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Alluvial Soil": {
        "en": "Very fertile — irrigate every 4-5 days. Excellent water retention.",
        "te": "చాలా సారవంతమైన నేల — 4-5 రోజులకు నీళ్ళు పెట్టండి."
    },
    "Saline Soil": {
        "en": "Salt affected — irrigate frequently to leach salts. Use drip irrigation.",
        "te": "ఉప్పు నేల — తరచుగా నీళ్ళు పెట్టండి. డ్రిప్ ఇరిగేషన్ వాడండి."
    }
}

# ── Detailed irrigation advice cards per soil type ─────────────────────────────
IRRIGATION_ADVICE_TEMPLATES: dict[str, list[tuple[str, str]]] = {
    "Black Cotton Soil": [
        ("Irrigate every 8–10 days — black cotton soil retains moisture 60% longer than sandy soils; over-irrigation causes waterlogging", "నల్ల నేల తేమను 60% ఎక్కువ కాలం నిలుపుకుంటుంది — 8–10 రోజులకొకసారి నీళ్ళు సరిపోతాయి; అదనంగా ఇస్తే నీటి నిల్వ అవుతుంది"),
        ("Irrigate in early morning (before 7am) to minimize surface evaporation on dark black soil that absorbs heat rapidly", "నల్ల నేల వేడిని వేగంగా గ్రహిస్తుంది — ఉదయం 7 గంటల లోపు నీళ్ళు పెట్టి ఆవిరి నష్టాన్ని తగ్గించండి"),
        ("Install broad-bed furrow drainage — black cotton soil swells when wet and cracks when dry, blocking normal outlets", "నల్ల నేల తడిసినప్పుడు ఉబ్బుతుంది మరియు ఎండినప్పుడు పగులు పడుతుంది — విశాల బోదె కాలువ పద్ధతితో మురుగు నీరు పోయేలా చేయండి"),
        ("Monitor drainage channels weekly — cracked black soil blocks water outlets causing flash waterlogging after irrigation", "నల్ల నేల పగుళ్ళు మురుగు కాలువలను మూసివేస్తాయి — వారానికి ఒకసారి కాలువలు తనిఖీ చేయండి"),
    ],
    "Red Sandy Soil": [
        ("Irrigate every 3–4 days — red sandy soil drains 3× faster than black cotton soil and holds only 30% of the water", "ఎర్ర నేల నీటిని 3 రెట్లు వేగంగా వదిలేస్తుంది — 3–4 రోజులకొకసారి నీళ్ళు పెట్టండి"),
        ("Use drip irrigation — red sandy soil loses 40% more water through runoff; drip delivers water directly to the root zone", "ఎర్ర నేలలో 40% నీరు పైపొర ప్రవాహంగా పోతుంది — డ్రిప్ నీటిపారుదల నేరుగా వేరుకు నీళ్ళు అందిస్తుంది"),
        ("Apply 3–4 cm thick mulching immediately — sandy soil loses moisture 50% faster through evaporation in summer heat", "వేసవి వేడిలో ఇసుక నేల 50% వేగంగా తేమ కోల్పోతుంది — 3–4 సెం.మీ మందాన మల్చింగ్ వేయండి"),
        ("Split irrigation into two smaller doses per cycle — sandy soil cannot hold large water volumes at once", "ఒకేసారి ఎక్కువ నీళ్ళు పట్టని ఇసుక నేలలో ప్రతి తడిని రెండు చిన్న విడతలుగా పెట్టండి"),
    ],
    "Clay Soil": [
        ("Irrigate every 6–8 days — clay soil holds moisture well but excess water causes root rot and anaerobic conditions", "బంక నేల తేమ బాగా నిలుపుకుంటుంది — 6–8 రోజులకొకసారి నీళ్ళు సరిపోతాయి; అధికంగా ఇస్తే వేరు కుళ్ళు వస్తుంది"),
        ("Clear drainage channels before each irrigation — clay soil waterlogging is the number one root disease risk", "నీళ్ళు పెట్టే ముందు మురుగు కాలువలు తెరుచుకున్నాయో తనిఖీ చేయండి — బంక నేలలో నీటి నిల్వ ప్రధాన వేరు తెగులు ముప్పు"),
        ("Stop irrigation 48 hours before expected rain — clay soil cannot absorb additional water fast enough to prevent flooding", "వర్షం రాబోయే 48 గంటల ముందు నీళ్ళు ఆపండి — బంక నేల అదనపు నీటిని వేగంగా గ్రహించలేదు"),
        ("Till lightly after irrigation to break surface crust and improve aeration at the root zone", "నీళ్ళు పెట్టిన తర్వాత నేల పైపొర కీళ్ళు తెరవడానికి తేలికగా దుక్కి చేయండి — వేరు వ్యవస్థకు గాలి సరఫరా మెరుగవుతుంది"),
    ],
    "Loamy Soil": [
        ("Irrigate every 5–7 days — loamy soil has ideal water retention and drainage balance, supporting healthy root growth", "గరప నేలలో 5–7 రోజులకొకసారి నీళ్ళు పెట్టండి — ఇది నీటి నిలుపుదల మరియు మురుగు సమతుల్యంగా ఉంటుంది"),
        ("Maintain consistent irrigation schedule — loamy soil rewards regular moisture with 15–20% higher yields than erratic watering", "క్రమం తప్పకుండా నీళ్ళు పెట్టడం వల్ల గరప నేలలో 15–20% అధిక దిగుబడి వస్తుంది"),
        ("Add compost before each irrigation cycle to reinforce loamy soil structure and improve long-term water retention", "ప్రతి తడి ముందు సేంద్రీయ ఎరువు వేయండి — గరప నేల నిర్మాణం మరియు నీటి నిలుపుదల పెరుగుతుంది"),
        ("Adjust irrigation frequency when ET0 exceeds 5mm/day — increase to every 4–5 days in peak summer conditions", "ET0 రేటు రోజుకు 5 మిమీ కంటే ఎక్కువ అయినప్పుడు 4–5 రోజులకొకసారి నీళ్ళు పెట్టండి"),
    ],
}

DEFAULT_IRRIGATION_ADVICE: list[tuple[str, str]] = [
    ("Irrigate in early morning (5–7am) — peak evaporation between 10am–4pm wastes up to 30% of applied water", "ఉదయం 5–7 గంటల మధ్య నీళ్ళు పెట్టండి — పగటి వేళ 30% నీరు ఆవిరవుతుంది"),
    ("Check soil moisture at 10cm depth before each irrigation — water only when root zone feels dry", "నీళ్ళు పెట్టే ముందు 10 సెం.మీ లోతులో నేల తేమ తనిఖీ చేయండి — వేరు స్థాయిలో పొడిగా ఉన్నప్పుడే నీళ్ళు పెట్టండి"),
    ("Skip irrigation if rain probability exceeds 60% in the 48-hour forecast — unnecessary irrigation wastes water and leaches nutrients", "48 గంటల అంచనాలో 60% కంటే ఎక్కువ వర్షం అవకాశం ఉంటే నీళ్ళు వేయడం ఆపండి — అనవసర తడి పోషకాలను కడిగేస్తుంది"),
    ("Apply organic mulching to reduce ET0 water loss by 30–40% during high heat and low humidity periods", "అధిక వేడి మరియు తక్కువ తేమ సమయంలో ET0 నష్టాన్ని 30–40% తగ్గించడానికి సేంద్రీయ మల్చింగ్ వేయండి"),
]

_FALLBACK_ACTION = ActionItem(
    icon_type="check",
    en="Consult your local agricultural extension officer for current conditions",
    te="ప్రస్తుత పరిస్థితుల కోసం మీ స్థానిక వ్యవసాయ అధికారిని సంప్రదించండి",
)

def _safe_action_items(items) -> list[ActionItem]:
    """Parse a list of action dicts from Gemini; fill missing/malformed items with a fallback."""
    result = []
    for a in (items or []):
        if isinstance(a, dict) and a.get("en") and a.get("te"):
            result.append(ActionItem(
                icon_type=a.get("icon_type", "check"),
                en=a["en"],
                te=a["te"],
            ))
    return result if result else [_FALLBACK_ACTION]


def _safe_summary_section(sec, title_en: str, title_te: str, color: str, icon_type: str) -> SummarySectionItem:
    """Build a SummarySectionItem from a Gemini dict, filling any missing fields with safe defaults."""
    if not isinstance(sec, dict):
        sec = {}
    return SummarySectionItem(
        title_en  = sec.get("title_en",  title_en),
        title_te  = sec.get("title_te",  title_te),
        text_en   = sec.get("text_en",   "Analysis data not available for this section."),
        text_te   = sec.get("text_te",   "ఈ విభాగానికి విశ్లేషణ డేటా అందుబాటులో లేదు."),
        color     = sec.get("color",     color),
        icon_type = sec.get("icon_type", icon_type),
    )


class GeminiService:
    @staticmethod
    async def generate_adaptation_plan(
        crop: str,
        plot_size: float,
        weather: List[DailyWeatherItem],
        risks: List[RiskItem],
        crop_stage: str = None,
        soil_type: str = None,
        location_name: str = "Telangana Farm",
    ) -> tuple[ActionPlan, FarmSummary, list, list, list, list]:

        print(f"Generating plan: crop={crop}, stage={crop_stage}, soil={soil_type}")

        # If key is not present, skip and generate template immediately
        if not settings.GEMINI_API_KEY:
            logger.info("Gemini API key is missing. Generating template-based adaptation plan...")
            return GeminiService._generate_template_plan(crop, plot_size, weather, risks, crop_stage, soil_type)

        logger.info("Gemini API key found. Attempting to generate AI advice...")
        print(f"Calling Gemini for: {crop} at {crop_stage} stage — key present")

        # Extract today's granular weather stats
        wd0 = weather[0] if weather else None
        today_temp    = round(wd0.temp_max)              if wd0 else 0
        today_rain    = round(wd0.precipitation)         if wd0 else 0
        today_soil_s  = round((wd0.soil_moisture or 0) * 100) if wd0 else 0
        today_soil_r  = max(10, today_soil_s - 6)
        today_et0     = round(wd0.evapotranspiration, 1) if wd0 else 0
        today_wind    = round(wd0.wind_speed)            if wd0 else 0
        today_uv      = round(wd0.uv_index, 1)           if wd0 else 0
        today_humidity= round(wd0.relative_humidity)     if wd0 else 0
        max_t  = max(item.temp_max for item in weather)
        total_p = sum(item.precipitation for item in weather)
        risk_summary = ", ".join([f"{r.en_name} ({r.severity})" for r in risks if r.severity in ["WARNING", "CRITICAL"]]) or "No critical risks"
        week_temps  = [item.temp_max for item in weather[:7]]
        week_rain   = [item.precipitation for item in weather[:7]]
        week_peak_t = round(max(week_temps)) if week_temps else today_temp
        week_rain_t = round(sum(week_rain), 1) if week_rain else 0
        print("=== DATA SENT TO GEMINI ===")
        print(f"Crop: {crop} at {crop_stage}")
        print(f"Soil: {soil_type}")
        print(f"Plot: {plot_size} acres")
        print(f"Location: {location_name}")
        print(f"Temp today: {today_temp}°C")
        print(f"ET0 today: {today_et0}mm")
        print(f"Soil moisture: {today_soil_s}%")
        print(f"Rain today: {today_rain}mm")
        print(f"Critical risks: {[r.en_name for r in risks if r.severity == 'CRITICAL']}")
        print(f"Warning risks: {[r.en_name for r in risks if r.severity == 'WARNING']}")
        print("===========================")

        # Build stage and soil context
        stage_age = ""
        if crop_stage and crop.lower() in STAGE_AGE_MAP:
            age_range = STAGE_AGE_MAP[crop.lower()].get(crop_stage, "")
            if age_range:
                stage_age = f" (~{age_range} days after sowing)"
        stage_line = f"\n- Crop Stage: {crop_stage}{stage_age}" if crop_stage else "\n- Crop Stage: not specified"
        soil_line  = f"\n- Soil Type: {soil_type}"              if soil_type  else "\n- Soil Type: not specified"

        prompt = f"""
You are an expert agricultural climatologist specializing in smallholder farming in Telangana, India.
Generate a full farm advisory for a farmer growing {crop} on a {plot_size} acre plot.

FARM CONTEXT:{stage_line}{soil_line}
- Location: {location_name}
- Plot size: {plot_size} acres

CURRENT WEATHER CONDITIONS (real satellite + weather data):
- Max temperature today: {today_temp}°C (14-day max: {max_t}°C)
- Rain today: {today_rain}mm (14-day total: {total_p:.1f}mm)
- Surface soil moisture: {today_soil_s}%
- Root zone soil moisture: {today_soil_r}%
- ET0 water loss rate: {today_et0}mm/day
- Wind speed: {today_wind}km/h
- UV Index: {today_uv}
- Humidity: {today_humidity}%
- Active risks: {risk_summary}

7-DAY FORECAST PEAK:
- Peak temperature next 7 days: {week_peak_t}°C
- Total rainfall next 7 days: {week_rain_t}mm

{'IMPORTANT: Crop is at ' + crop_stage + ' stage. All today actions AND stage_advice must explicitly reference this stage and how current weather affects it.' if crop_stage else ''}
{'IMPORTANT: All irrigation_advice must be specific to ' + soil_type + ' soil properties and the current ET0/soil moisture readings above.' if soil_type else ''}

You must return a JSON response matching this EXACT JSON schema:
{{
  "action_plan": {{
    "today": [
      {{ "icon_type": "check", "en": "Today action in English", "te": "Today action in Telugu" }},
      {{ "icon_type": "check", "en": "Today action in English", "te": "Today action in Telugu" }},
      {{ "icon_type": "warning", "en": "Today warning in English", "te": "Today warning in Telugu" }}
    ],
    "week": [
      {{ "icon_type": "check", "en": "Weekly action in English", "te": "Weekly action in Telugu" }},
      {{ "icon_type": "check", "en": "Weekly action in English", "te": "Weekly action in Telugu" }},
      {{ "icon_type": "warning", "en": "Weekly warning in English", "te": "Weekly warning in Telugu" }}
    ],
    "month": [
      {{ "icon_type": "check", "en": "Monthly action in English", "te": "Monthly action in Telugu" }},
      {{ "icon_type": "check", "en": "Monthly action in English", "te": "Monthly action in Telugu" }},
      {{ "icon_type": "check", "en": "Monthly action in English", "te": "Monthly action in Telugu" }}
    ]
  }},
  "farm_summary": {{
    "weather": {{
      "title_en": "Weather Conditions",
      "title_te": "వాతావరణ స్థితి",
      "text_en": "English summary of 14-day forecast, temperatures, rain",
      "text_te": "Telugu summary of 14-day forecast, temperatures, rain",
      "color": "#3b82f6",
      "icon_type": "cloud"
    }},
    "soil": {{
      "title_en": "Soil Status",
      "title_te": "నేల స్థితి",
      "text_en": "English summary of soil moisture and evaporation",
      "text_te": "Telugu summary of soil moisture and evaporation",
      "color": "#16a34a",
      "icon_type": "layers"
    }},
    "risk": {{
      "title_en": "Risk Status",
      "title_te": "ప్రమాద స్థితి",
      "text_en": "English summary of critical risks like heatwaves or drought",
      "text_te": "Telugu summary of critical risks like heatwaves or drought",
      "color": "#dc2626",
      "icon_type": "alert"
    }},
    "recommendation": {{
      "title_en": "Our Recommendation",
      "title_te": "మా సూచన",
      "text_en": "English key summary recommendations",
      "text_te": "Telugu key summary recommendations",
      "color": "#f59e0b",
      "icon_type": "lightbulb"
    }}
  }},
  "stage_advice": {{
    "en": ["3-4 specific advice strings for the crop at its current growth stage considering the weather data above — mention actual numbers (temp, ET0, soil moisture) in each point"],
    "te": ["3-4 Telugu translations of stage_advice.en — simple farmer-friendly language"]
  }},
  "irrigation_advice": {{
    "en": ["3-4 specific irrigation recommendations that combine the soil type, current ET0 rate, soil moisture readings, and crop stage above — no generic advice"],
    "te": ["3-4 Telugu translations of irrigation_advice.en"]
  }}
}}

Guidelines:
- Return exactly 3 action items for today, week, and month.
- Return exactly 3–4 strings each in stage_advice.en, stage_advice.te, irrigation_advice.en, irrigation_advice.te.
- Every stage_advice point must name the crop stage and reference at least one real weather value (temp, ET0, rain, soil moisture).
- Every irrigation_advice point must reference the soil type and at least one real value (ET0, soil moisture %, frequency).
- Translate to simple, farmer-friendly Telugu using the Telugu script.
- Return ONLY valid JSON. Do not include markdown codeblocks, notes, preamble, or explanations.
"""

        try:
            if _DETECTED_MODEL is None:
                get_working_model()
            if _DETECTED_MODEL is None:
                raise RuntimeError("No working Gemini model found")
            model = genai.GenerativeModel(
                _DETECTED_MODEL,
                generation_config={
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            )

            def _call_with_retry():
                try:
                    return model.generate_content(prompt)
                except Exception as e:
                    if "429" in str(e):
                        print("Rate limited - waiting 3 seconds...")
                        time.sleep(3)
                        return model.generate_content(prompt)
                    else:
                        raise

            response = await asyncio.wait_for(
                asyncio.to_thread(_call_with_retry),
                timeout=40.0,
            )
            content = response.text.strip()
            if content.startswith("```json"):
                content = content.split("```json", 1)[1].split("```", 1)[0].strip()
            elif content.startswith("```"):
                content = content.split("```", 1)[1].split("```", 1)[0].strip()

            parsed = json.loads(content)
            print("=== GEMINI RESPONSE ===")
            print(f"today_en: {[a['en'] for a in parsed.get('action_plan', {}).get('today', [])]}")
            print(f"summary weather: {parsed.get('farm_summary', {}).get('weather', {}).get('text_en', 'MISSING')}")
            print(f"stage_advice_en: {parsed.get('stage_advice', {}).get('en', [])}")
            print(f"irrigation_advice_en: {parsed.get('irrigation_advice', {}).get('en', [])}")
            print(f"farm_summary keys: {list(parsed.get('farm_summary', {}).keys())}")
            print("======================")

            ap = parsed.get("action_plan", {})
            actions = ActionPlan(
                today  = _safe_action_items(ap.get("today",  [])),
                week   = _safe_action_items(ap.get("week",   [])),
                month  = _safe_action_items(ap.get("month",  [])),
            )

            fs = parsed.get("farm_summary", {})
            summary = FarmSummary(
                weather        = _safe_summary_section(fs.get("weather"),        "Weather Conditions", "వాతావరణ స్థితి", "#3b82f6", "cloud"),
                soil           = _safe_summary_section(fs.get("soil"),           "Soil Status",        "నేల స్థితి",      "#16a34a", "layers"),
                risk           = _safe_summary_section(fs.get("risk"),           "Risk Status",        "ప్రమాద స్థితి",   "#dc2626", "alert"),
                recommendation = _safe_summary_section(fs.get("recommendation"), "Our Recommendation", "మా సూచన",        "#f59e0b", "lightbulb"),
            )

            sa = parsed.get("stage_advice", {})
            ia = parsed.get("irrigation_advice", {})
            logger.info("Successfully generated full adaptation plan via Gemini.")
            return (
                actions,
                summary,
                sa.get("en", []),
                sa.get("te", []),
                ia.get("en", []),
                ia.get("te", []),
            )
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}. Falling back to template plan...")
            print("WARNING: Using template - Gemini failed")

        return GeminiService._generate_template_plan(crop, plot_size, weather, risks, crop_stage, soil_type)

    @staticmethod
    def _generate_template_plan(crop: str, plot_size: float, weather: List[DailyWeatherItem], risks: List[RiskItem], crop_stage: str = None, soil_type: str = None) -> tuple[ActionPlan, FarmSummary, list, list, list, list]:
        crop_lower = crop.lower()

        # Extract real weather values for use in summary texts
        wd0        = weather[0] if weather else None
        t_temp     = round(wd0.temp_max)                       if wd0 else 0
        t_et0      = round(wd0.evapotranspiration, 1)          if wd0 else 0
        t_soil_s   = round((wd0.soil_moisture or 0) * 100)     if wd0 else 0
        t_soil_r   = max(10, t_soil_s - 6)
        t_rain     = round(wd0.precipitation)                  if wd0 else 0
        t_humidity = round(wd0.relative_humidity)              if wd0 else 0
        max_t      = round(max(item.temp_max for item in weather))     if weather else 0
        total_p    = round(sum(item.precipitation for item in weather), 1) if weather else 0

        # 1. Action Items Template database
        paddy_actions = {
            "today": [
                ActionItem(icon_type="check", en="Irrigate before 7am to avoid high daytime evaporation rates", te="పగటిపూట అధిక నీటి నష్టాన్ని నివారించడానికి ఉదయం 7 గంటలకు ముందే నీళ్ళు పెట్టండి"),
                ActionItem(icon_type="check", en="Apply organic mulching to the nursery bed to retain soil moisture", te="నేలలో తేమ నిలుపుకోవడానికి నారుమడి వద్ద సేంద్రీయ మల్చింగ్ చేయండి"),
                ActionItem(icon_type="warning", en="Monitor closely for brown planthopper (BPH) pest activity", te="గోధుమ రంగు ఈక పురుగుల నిఘా పెట్టండి మరియు పొలాన్ని గమనించండి")
            ],
            "week": [
                ActionItem(icon_type="check", en="Delay fertiliser application by 5 days during critical heat spells", te="తీవ్రమైన వేడి కాలంలో ఎరువులు వేయడం ఐదు రోజులు వాయిదా వేయండి"),
                ActionItem(icon_type="check", en="Check and clean irrigation channels to prevent water losses", te="నీటి నష్టాలను నివారించడానికి సాగు నీటి కాలువలను తనిఖీ చేసి శుభ్రం చేయండి"),
                ActionItem(icon_type="warning", en="Scout for stem borer infestation and prepare neem oil sprays", te="వరి కాండం తొలిచే పురుగుల ఆశించే ముప్పును గమనించి వేప నూనె పిచికారీకి సిద్ధమవండి")
            ],
            "month": [
                ActionItem(icon_type="check", en="Consider sowing drought-resistant varieties (e.g. MTU 1010, Tellahamsa)", te="కరువును తట్టుకునే వరి రకాలను (ఉదా. MTU 1010, తెల్లహంస) సాగు చేయడాన్ని పరిశీలించండి"),
                ActionItem(icon_type="check", en="Install micro-irrigation lines or drip systems to conserve groundwater", te="భూగర్భ జలాలను కాపాడుకోవడానికి డ్రిప్ లేదా సూక్ష్మ నీటిపారుదల వ్యవస్థను ఏర్పాటు చేయండి"),
                ActionItem(icon_type="check", en="Apply compost or green manure to enrich soil organic carbon content", te="నేల సేంద్రీయ కార్బన్ కంటెంట్‌ను పెంచడానికి సేంద్రీయ ఎరువు లేదా పచ్చిరొట్ట ఎరువు వేయండి")
            ]
        }
        
        cotton_actions = {
            "today": [
                ActionItem(icon_type="check", en="Protect young boll stems from direct heat waves using light irrigation", te="తేలికపాటి సాగు నీటితో గులాబీ రంగు మొగ్గలను ఎండ తీవ్రత నుండి కాపాడండి"),
                ActionItem(icon_type="check", en="Spray potassium nitrate to reduce flower drop under heat stress", te="వేడి ఒత్తిడి వల్ల పూత రాలకుండా ఉండేందుకు పొటాషియం నైట్రేట్ పిచికారీ చేయండి"),
                ActionItem(icon_type="warning", en="Monitor for sucking pests like whitefly and thrips", te="తెల్లదోమ మరియు తామర పురుగుల ఉధృతిని నిరంతరం గమనించండి")
            ],
            "week": [
                ActionItem(icon_type="check", en="Ensure wind barrier crops (like maize or sorghum) are growing at borders", te="పొలం చుట్టూ రక్షణ బారగా జొన్న లేదా మొక్కజొన్న పంటలు ఉండేలా చూసుకోండి"),
                ActionItem(icon_type="check", en="Weed the field thoroughly to remove competitive water demand", te="ముఖ్యమైన నీటి కొరతను నివారించడానికి పొలంలో కలుపు మొక్కలను ఏరివేయండి"),
                ActionItem(icon_type="warning", en="Prepare bio-pesticides for early bollworm management", te="కాయ పురుగు నివారణ కోసం జీవ నియంత్రణ మందులను సిద్ధంగా ఉంచుకోండి")
            ],
            "month": [
                ActionItem(icon_type="check", en="Implement broad-bed furrow irrigation system to maximize moisture efficiency", te="తేమ సామర్థ్యం పెంచడానికి విశాల బోదె కాలువల పద్ధతిని అమలు చేయండి"),
                ActionItem(icon_type="check", en="Test soil salinity levels to prepare correct gypsum treatments", te="నేల చౌడు తీవ్రతను పరీక్షించి తగిన జిప్సం చికిత్సను సిద్ధం చేయండి"),
                ActionItem(icon_type="check", en="Plan crop rotation with pulses to restore nitrogen levels", te="నత్రజని పెంచడానికి పప్పుధాన్యాల పంటల మార్పిడికి ప్రణాళిక వేసుకోండి")
            ]
        }
        
        soybean_actions = {
            "today": [
                ActionItem(icon_type="check", en="Apply dry crop residues as mulch over seedbeds", te="విత్తన మడులపై పొడి పంట వ్యర్థాలను మల్చింగ్ గా వేయండి"),
                ActionItem(icon_type="check", en="Spray neem seed kernel extract for defoliating caterpillars", te="ఆకుతినే లద్దె పురుగుల నివారణకు వేప గింజల కషాయం పిచికారీ చేయండి"),
                ActionItem(icon_type="warning", en="Check for leaf folder insect nests in central branches", te="మధ్య కొమ్మలలో ఆకు చుట్టూ పురుగు గూళ్లను గమనించండి")
            ],
            "week": [
                ActionItem(icon_type="check", en="Perform light hoeing to create soil mulch and break capillaries", te="నేల ఉపరితలాన్ని తేలికగా తవ్వి భూమి తేమ కోల్పోకుండా చూసుకోండి"),
                ActionItem(icon_type="check", en="Inspect root nodules for healthy nitrogen fixation rates", te="నత్రజని స్థిరీకరణ సరిగ్గా జరగడానికి వేరు బుడిపెల ఆరోగ్యాన్ని పరిశీలించండి"),
                ActionItem(icon_type="warning", en="Watch out for rust disease symptoms on lower leaves", te="క్రింది ఆకులపై తుప్పు తెగులు లక్షణాలను గమనించండి")
            ],
            "month": [
                ActionItem(icon_type="check", en="Adopt conservation tillage to maintain organic matter and structure", te="నేల నిర్మాణాన్ని కాపాడటానికి రక్షణ దుక్కి పద్ధతులను అవలంబించండి"),
                ActionItem(icon_type="check", en="Establish drainage channels to prevent waterlogging during monsoon start", te="వర్షాలు పడినప్పుడు నీరు నిలవకుండా కాలువలను సిద్ధం చేయండి"),
                ActionItem(icon_type="check", en="Use biofertilizers like Rhizobium and PSB during inter-cultivation", te="అంతర కృషి సమయంలో రైజోబియం మరియు పి.ఎస్.బి వంటి జీవ ఎరువులను వాడండి")
            ]
        }
        
        chilli_actions = {
            "today": [
                ActionItem(icon_type="check", en="Provide frequent light irrigations through sprinkler systems", te="స్ప్రింక్లర్ పద్ధతి ద్వారా తరచుగా తేలికపాటి తడులు ఇవ్వండి"),
                ActionItem(icon_type="check", en="Spray multi-micronutrients to support plant stamina in heat", te="వేడిని తట్టుకునేలా మొక్కకు అవసరమైన సూక్ష్మపోషకాలను పిచికారీ చేయండి"),
                ActionItem(icon_type="warning", en="Monitor yellow traps for thrips and mites infestation", te="తామర పురుగుల మరియు నల్లి నివారణకు పసుపు జిగురు బోర్డులను ఏర్పాటు చేయండి")
            ],
            "week": [
                ActionItem(icon_type="check", en="Set up shade nets over young nursery beds if transplanting is delayed", te="నారు నాటడం ఆలస్యమైతే నారుమడి పై నీడ తెరలను ఏర్పాటు చేయండి"),
                ActionItem(icon_type="check", en="Ensure border sowing of tall crops like maize to block hot winds", te="వేడి గాలులను అడ్డుకోవడానికి మొక్కజొన్న వంటి ఎత్తైన పంటలను సరిహద్దుగా వేయండి"),
                ActionItem(icon_type="warning", en="Look out for die-back and fruit rot symptoms", te="కొమ్మ కుళ్ళు మరియు కాయ కుళ్ళు తెగులు లక్షణాలను పరిశీలించండి")
            ],
            "month": [
                ActionItem(icon_type="check", en="Install drip irrigation to reduce crop water requirements by 40%", te="సాగు నీటి అవసరాన్ని 40% తగ్గించడానికి డ్రిప్ నీటిపారుదలను అమర్చండి"),
                ActionItem(icon_type="check", en="Prepare raised bed planting structures to prevent root diseases", te="వేరు కుళ్ళు తెగుళ్లను నివారించడానికి ఎత్తైన బెడ్లను తయారు చేయండి"),
                ActionItem(icon_type="check", en="Apply farmyard manure mixed with Trichoderma viride to target fungi", te="ట్రైకోడెర్మా విరిడి కలిపిన పశువుల ఎరువును పొలంలో వేయండి")
            ]
        }
        
        turmeric_actions = {
            "today": [
                ActionItem(icon_type="check", en="Mulch rhizomes deeply with green leaves to lower soil temp", te="నేల ఉష్ణోగ్రతను తగ్గించడానికి పచ్చి ఆకులతో కొమ్ములకు మల్చింగ్ చేయండి"),
                ActionItem(icon_type="check", en="Maintain soil moisture to prevent drying of sprouted shoots", te="మొలకెత్తిన రెమ్మలు ఎండిపోకుండా నేలలో తేమను నిరంతరం కాపాడండి"),
                ActionItem(icon_type="warning", en="Check for rhizome rot disease in patches of low drainage", te="నీటి పారుదల తక్కువగా ఉన్న చోట్ల దుంప కుళ్ళు తెగులును గమనించండి")
            ],
            "week": [
                ActionItem(icon_type="check", en="Clear competitive weeds along the furrows to save moisture", te="తేమను ఆదా చేయడానికి బోదె కాలువలలో పెరిగిన కలుపును తొలగించండి"),
                ActionItem(icon_type="check", en="Apply nitrogenous fertilizers in splits during rainy intervals", te="వర్షపు జల్లులు పడే సమయంలో నత్రజని ఎరువులను విడతలవారీగా వేయండి"),
                ActionItem(icon_type="warning", en="Check for leaf spot disease and spray copper oxychloride if seen", te="ఆకు మచ్చ తెగులు నివారణకు కాపర్ ఆక్సిక్లోరైడ్ పిచికారీ సిద్ధం చేసుకోండి")
            ],
            "month": [
                ActionItem(icon_type="check", en="Use raised beds and proper spacing to support healthy root extension", te="దుంపలు బాగా పెరగడానికి ఎత్తైన బెడ్లు మరియు సరైన దూరం పాటించండి"),
                ActionItem(icon_type="check", en="Establish drainage channels to drain storm waters from low beds", te="తుఫాను నీరు నిలువకుండా కాలువలను సరిదిద్దండి"),
                ActionItem(icon_type="check", en="Apply neem cake to soil to prevent root nematodes", te="వేరు పురుగుల నివారణకు నేలలో వేప పిండిని చల్లండి")
            ]
        }
        
        # Pick the template database based on selected crop
        db = paddy_actions
        if "cotton" in crop_lower:
            db = cotton_actions
        elif "soybean" in crop_lower:
            db = soybean_actions
        elif "chilli" in crop_lower:
            db = chilli_actions
        elif "turmeric" in crop_lower:
            db = turmeric_actions

        # Override today actions with stage-specific items if crop_stage provided
        today_actions = db["today"]
        if crop_stage:
            stage_overrides = STAGE_TODAY_OVERRIDES.get(crop_lower, {})
            if crop_stage in stage_overrides:
                today_actions = stage_overrides[crop_stage]
                logger.info(f"Using stage-specific today actions for {crop_lower}/{crop_stage}")

        plan = ActionPlan(today=today_actions, week=db["week"], month=db["month"])
        
        # 2. Dynamic summary builder based on crop/plot size and risk outputs
        # Find critical/warning weather risks
        has_heatwave = any(r.key == "heatwave" and r.severity in ["WARNING", "CRITICAL"] for r in risks)
        has_drought = any(r.key == "drought" and r.severity in ["WARNING", "CRITICAL"] for r in risks)
        has_flood = any(r.key == "flood" and r.severity in ["WARNING", "CRITICAL"] for r in risks)
        has_pest = any(r.key == "pest" and r.severity in ["WARNING", "CRITICAL"] for r in risks)
        
        # Dynamic summaries using real weather values
        weather_title_en = "Weather Conditions"
        weather_title_te = "వాతావరణ స్థితి"
        if has_heatwave:
            weather_text_en = f"Heatwave alert — today's max is {t_temp}°C with a 14-day peak of {max_t}°C. Total rainfall forecast: {total_p}mm. Irrigate early morning to protect {crop}."
            weather_text_te = f"వేడి హెచ్చరిక — నేడు గరిష్టం {t_temp}°C, 14 రోజుల గరిష్టం {max_t}°C. మొత్తం వర్షపాత అంచనా: {total_p}మి.మీ. {crop} పంటను కాపాడటానికి ఉదయమే నీళ్ళు పెట్టండి."
        elif has_flood:
            weather_text_en = f"Heavy rain risk — {total_p}mm expected over 14 days. Today: {t_rain}mm. Humidity at {t_humidity}%. Ensure drainage channels are clear before the next rain event."
            weather_text_te = f"భారీ వర్షం ముప్పు — 14 రోజుల్లో {total_p}మి.మీ అంచనా. నేడు: {t_rain}మి.మీ. తేమ {t_humidity}%. వర్షానికి ముందు మురుగు కాలువలు తెరుచుకున్నాయో తనిఖీ చేయండి."
        else:
            weather_text_en = f"Temperature today: {t_temp}°C (14-day peak: {max_t}°C). Total forecast rainfall: {total_p}mm. ET0 at {t_et0}mm/day — plan irrigations accordingly."
            weather_text_te = f"నేడు ఉష్ణోగ్రత: {t_temp}°C (14 రోజుల గరిష్టం: {max_t}°C). మొత్తం వర్షపాత అంచనా: {total_p}మి.మీ. ET0 {t_et0}మి.మీ/రోజు — తదనుగుణంగా నీళ్ళు ప్లాన్ చేయండి."

        soil_title_en = "Soil Status"
        soil_title_te = "నేల స్థితి"
        soil_text_en = f"Surface soil moisture: {t_soil_s}%. Root zone moisture: {t_soil_r}% for your {plot_size} acre farm. ET0 water loss rate: {t_et0}mm/day — irrigate before 7am to minimise evaporation."
        soil_text_te = f"మీ {plot_size} ఎకరాల పొలంలో నేల ఉపరితల తేమ {t_soil_s}%. వేరు స్థాయి తేమ {t_soil_r}%. ET0 నీటి నష్టం రోజుకు {t_et0}మి.మీ — ఆవిరి తగ్గించడానికి ఉదయం 7 గంటల లోపు నీళ్ళు పెట్టండి."

        risk_title_en = "Risk Status"
        risk_title_te = "ప్రమాద స్థితి"
        if has_heatwave and has_drought:
            risk_text_en = f"Your {crop} crop is in a high risk situation. A heatwave is incoming. Drought risk is also present. Take immediate action."
            risk_text_te = f"మీ {crop} పంటకు అత్యంత ప్రమాదకర స్థితి — వేడి తరంగం వస్తోంది. కరువు ప్రమాదం కూడా ఉంది. వెంటనే చర్యలు తీసుకోండి."
        elif has_flood:
            risk_text_en = f"High flood and root submersion risk detected for {crop}. Saturated soil might trigger fungal rhizome rot."
            risk_text_te = f"వరి/మొక్కలకు అధిక వరద మరియు వేరు మునిగే ముప్పు ఉంది. నిల్వ నీరు దుంప కుళ్ళు లేదా శిలీంధ్ర తెగుళ్లను ప్రేరేపిస్తుంది."
        elif has_pest:
            risk_text_en = f"Warm and highly humid settings create a critical risk of sucking pests and blight outbreaks."
            risk_text_te = f"వేడి మరియు తేమతో కూడిన వాతావరణం పురుగులు ఆశించడానికి మరియు ఆకుమచ్చ తెగులు వ్యాప్తికి అత్యంత అనుకూలం."
        else:
            risk_text_en = "Moderate water loss and soil drying risk. Protect root zones and keep drainage systems clear."
            risk_text_te = "సాధారణ నీటి నష్టం మరియు నేల ఎండిపోయే ముప్పు ఉంది. వేరు వ్యవస్థను కాపాడటానికి తగిన జాగ్రత్తలు తీసుకోండి."

        # Build soil irrigation note suffix
        soil_note_en = ""
        soil_note_te = ""
        if soil_type and soil_type in SOIL_IRRIGATION_NOTES:
            soil_note_en = " " + SOIL_IRRIGATION_NOTES[soil_type]["en"]
            soil_note_te = " " + SOIL_IRRIGATION_NOTES[soil_type]["te"]
            logger.info(f"Applying soil-specific irrigation note for: {soil_type}")

        rec_title_en = "Our Recommendation"
        rec_title_te = "మా సూచన"
        if "paddy" in crop_lower:
            rec_text_en = "Irrigate before 7am. Apply mulching. Delay fertiliser by 5 days. Monitor for pest activity."
            rec_text_te = "ఉదయం 7 గంటలకు ముందు నీళ్ళు పెట్టండి. మల్చింగ్ వేయండి. ఎరువులు 5 రోజులు వాయిదా వేయండి. పురుగుల నిఘా పెట్టండి."
        elif "cotton" in crop_lower:
            rec_text_en = "Spray potassium nitrate to avoid boll drop. Maintain border windbreaks. Apply shallow hoeing."
            rec_text_te = "మొగ్గలు రాలకుండా పొటాషియం నైట్రేట్ చల్లండి. పొలం గట్ల వద్ద రక్షణ మొక్కలను పెంచండి. కలుపు తొలగించండి."
        elif "soybean" in crop_lower:
            rec_text_en = "Use seedbed organic mulch. Inspect root nodules. Prep drainage channels for rain shifts."
            rec_text_te = "నారుమడులపై సేంద్రీయ మల్చింగ్ వేయండి. వేరు బుడిపెలను తనిఖీ చేయండి. మురుగునీరు పోయే కాలువలను సరిదిద్దండి."
        elif "chilli" in crop_lower:
            rec_text_en = "Set up blue/yellow sticky traps. Sprinkle light irrigations. Inspect daily for thrips."
            rec_text_te = "పసుపు జిగురు అట్టలను అమర్చండి. స్ప్రింక్లర్ తో తేలికపాటి తడులు ఇవ్వండి. తామర పురుగుల నిఘా ఉంచండి."
        else:
            rec_text_en = "Apply deep mulch layers. Inspect rhizomes daily. Ensure efficient soil drainage."
            rec_text_te = "దుంపలకు దట్టమైన ఆకుల మల్చింగ్ వేయండి. ప్రతిరోజూ దుంపలను పరిశీలించండి. కాలువలలో కలుపు తీయండి."

        # Append soil-type irrigation guidance to recommendation
        rec_text_en += soil_note_en
        rec_text_te += soil_note_te

        # ── Stage-specific advice (extracted from stage overrides or generic) ──
        stage_adv_en: list[str] = []
        stage_adv_te: list[str] = []
        if crop_stage:
            stage_items = STAGE_TODAY_OVERRIDES.get(crop_lower, {}).get(crop_stage, [])
            if stage_items:
                stage_adv_en = [item.en for item in stage_items]
                stage_adv_te = [item.te for item in stage_items]
            else:
                stage_adv_en = [f"Apply general best practices for {crop} at {crop_stage} stage and monitor daily for stress signs"]
                stage_adv_te = [f"{crop} పంటలో {crop_stage} దశలో సాధారణ వ్యవసాయ విధానాలు పాటించి రోజూ పంటను పరిశీలించండి"]

        # ── Irrigation advice (from soil-type template or default) ──
        irr_pairs = IRRIGATION_ADVICE_TEMPLATES.get(soil_type or "", DEFAULT_IRRIGATION_ADVICE)
        irr_adv_en = [p[0] for p in irr_pairs]
        irr_adv_te = [p[1] for p in irr_pairs]

        summary = FarmSummary(
            weather=SummarySectionItem(
                title_en=weather_title_en, title_te=weather_title_te,
                text_en=weather_text_en, text_te=weather_text_te,
                color="#3b82f6", icon_type="cloud"
            ),
            soil=SummarySectionItem(
                title_en=soil_title_en, title_te=soil_title_te,
                text_en=soil_text_en, text_te=soil_text_te,
                color="#16a34a", icon_type="layers"
            ),
            risk=SummarySectionItem(
                title_en=risk_title_en, title_te=risk_title_te,
                text_en=risk_text_en, text_te=risk_text_te,
                color="#dc2626", icon_type="alert"
            ),
            recommendation=SummarySectionItem(
                title_en=rec_title_en, title_te=rec_title_te,
                text_en=rec_text_en, text_te=rec_text_te,
                color="#f59e0b", icon_type="lightbulb"
            )
        )
        
        return plan, summary, stage_adv_en, stage_adv_te, irr_adv_en, irr_adv_te
