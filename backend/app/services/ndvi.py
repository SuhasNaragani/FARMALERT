import asyncio
import httpx
from datetime import datetime, timedelta


def get_lai_optimal(crop_type: str = None) -> tuple:
    optimal = {
        "paddy":    (4.0, 6.0),
        "cotton":   (3.0, 5.0),
        "chilli":   (2.0, 4.0),
        "soybean":  (3.5, 5.5),
        "turmeric": (2.5, 4.5),
    }
    key = (crop_type or "").lower()
    return optimal.get(key, (3.0, 5.0))


async def _fetch_modis(
    client: httpx.AsyncClient,
    product: str,
    lat: float,
    lon: float,
    startDate: str,
    endDate: str,
) -> dict:
    url = f"https://modis.ornl.gov/rst/api/v1/{product}/subset"
    params = {
        "latitude":     lat,
        "longitude":    lon,
        "startDate":    startDate,
        "endDate":      endDate,
        "kmAboveBelow": 0,
        "kmLeftRight":  0,
    }
    try:
        response = await client.get(url, params=params, headers={"Accept": "application/json"})
        if response.status_code == 400:
            print(f"MODIS 400 error for {url} - using placeholder")
            raise ValueError(f"MODIS 400 for {product}")
        return response.json()
    except ValueError:
        raise
    except Exception as e:
        print(f"MODIS error: {e}")
        raise


async def fetch_ndvi(
    lat: float,
    lon: float,
    air_temp: float = None,
    crop_type: str = None,
) -> dict:
    """
    Fetch NDVI, EVI, LST, LAI from NASA MODIS in parallel.
    250m / 500m / 1km resolution composites. Free, no API key needed.
    """
    end_date   = datetime.now()
    start_date = end_date - timedelta(days=180)
    startDate  = start_date.strftime("A%Y%j")
    endDate    = end_date.strftime("A%Y%j")

    print(f"Calling MODIS API for: {lat}, {lon}")
    print(f"Date range: {startDate} to {endDate}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            mod13q1_data, mod11a2_data, mod15a2h_data = await asyncio.gather(
                _fetch_modis(client, "MOD13Q1",  lat, lon, startDate, endDate),
                _fetch_modis(client, "MOD11A2",  lat, lon, startDate, endDate),
                _fetch_modis(client, "MOD15A2H", lat, lon, startDate, endDate),
                return_exceptions=True,
            )

        # ── NDVI + EVI from MOD13Q1 ──────────────────────────────────────
        ndvi_values = []
        evi_values  = []
        if not isinstance(mod13q1_data, Exception):
            for subset in mod13q1_data.get("subset", []):
                band = subset.get("band", "")
                raw  = subset.get("data", [])
                if band == "250m_16_days_NDVI":
                    ndvi_values.extend(v * 0.0001 for v in raw if v != -3000 and v > 0)
                elif band == "250m_16_days_EVI":
                    evi_values.extend(v * 0.0001 for v in raw if v != -3000 and v > 0)

        if not ndvi_values:
            return get_ndvi_placeholder(crop_type)

        current_ndvi  = ndvi_values[-1]
        previous_ndvi = ndvi_values[-2] if len(ndvi_values) > 1 else current_ndvi
        trend         = current_ndvi - previous_ndvi
        current_evi   = evi_values[-1] if evi_values else None

        # ── LST from MOD11A2 ─────────────────────────────────────────────
        lst_celsius = None
        if not isinstance(mod11a2_data, Exception):
            for subset in mod11a2_data.get("subset", []):
                if subset.get("band") == "LST_Day_1km":
                    valid = [v * 0.02 - 273.15 for v in subset.get("data", []) if v > 0]
                    if valid:
                        lst_celsius = valid[-1]
                        break

        # ── LAI from MOD15A2H ────────────────────────────────────────────
        lai = None
        if not isinstance(mod15a2h_data, Exception):
            for subset in mod15a2h_data.get("subset", []):
                if subset.get("band") == "Lai_500m":
                    valid = [v * 0.1 for v in subset.get("data", []) if 0 <= v < 249]
                    if valid:
                        lai = valid[-1]
                        break

        print(f"EVI: {current_evi}")
        print(f"LST: {lst_celsius}°C vs Air: {air_temp}°C")
        print(f"LAI: {lai}")

        # ── Status classification ─────────────────────────────────────────
        if current_ndvi >= 0.6:
            status, status_te, color = "HEALTHY",  "ఆరోగ్యకరమైన పంట",             "green"
        elif current_ndvi >= 0.4:
            status, status_te, color = "MODERATE", "సాధారణ పంట ఆరోగ్యం",           "amber"
        elif current_ndvi >= 0.2:
            status, status_te, color = "STRESSED", "పంటకు ఒత్తిడి ఉంది",            "orange"
        else:
            status, status_te, color = "CRITICAL", "పంట విమర్శనాత్మక స్థితిలో ఉంది", "red"

        if trend < -0.05:
            cause_en = "Declining — possible water stress or pest damage"
            cause_te = "తగ్గుతోంది — నీటి ఒత్తిడి లేదా పురుగు నష్టం"
        elif trend > 0.05:
            cause_en = "Improving — crop recovering well"
            cause_te = "మెరుగుపడుతోంది — పంట బాగా కోలుకుంటోంది"
        else:
            cause_en = "Stable crop health"
            cause_te = "స్థిరమైన పంట ఆరోగ్యం"

        lai_min, lai_max = get_lai_optimal(crop_type)
        lst_vs_air = (
            round(lst_celsius - air_temp, 1)
            if lst_celsius is not None and air_temp is not None
            else None
        )

        return {
            "ndvi":           round(current_ndvi, 3),
            "ndvi_previous":  round(previous_ndvi, 3),
            "trend":          round(trend, 3),
            "trend_direction": "up" if trend > 0 else "down",
            "status":         status,
            "status_te":      status_te,
            "color":          color,
            "cause_en":       cause_en,
            "cause_te":       cause_te,
            "history":        [round(v, 3) for v in ndvi_values[-6:]],
            "source":         "NASA MODIS Terra",
            "evi":            round(current_evi, 3) if current_evi is not None else None,
            "lst_celsius":    round(lst_celsius, 1) if lst_celsius is not None else None,
            "lst_vs_air":     lst_vs_air,
            "lai":            round(lai, 2) if lai is not None else None,
            "lai_optimal_min": lai_min,
            "lai_optimal_max": lai_max,
        }

    except Exception as e:
        print(f"NDVI fetch error: {e}")
        return get_ndvi_placeholder(crop_type)


def get_ndvi_placeholder(crop_type: str = None) -> dict:
    """Fallback when MODIS API unavailable."""
    lai_min, lai_max = get_lai_optimal(crop_type)
    return {
        "ndvi":           0.52,
        "ndvi_previous":  0.58,
        "trend":          -0.06,
        "trend_direction": "down",
        "status":         "MODERATE",
        "status_te":      "సాధారణ పంట ఆరోగ్యం",
        "color":          "amber",
        "cause_en":       "Slight decline — monitor for water stress",
        "cause_te":       "కొంచెం తగ్గుతోంది — నీటి ఒత్తిడి గమనించండి",
        "history":        [0.71, 0.68, 0.65, 0.61, 0.58, 0.52],
        "source":         "Estimated (satellite data temporarily unavailable)",
        "evi":            0.31,
        "lst_celsius":    38.5,
        "lst_vs_air":     2.1,
        "lai":            2.8,
        "lai_optimal_min": lai_min,
        "lai_optimal_max": lai_max,
    }
