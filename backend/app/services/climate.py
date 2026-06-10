import httpx
import logging
from datetime import datetime
from typing import List, Dict, Any
from app.models import HistoricalItem, DailyWeatherItem

logger = logging.getLogger("farmalert.climate")

class ClimateService:
    @staticmethod
    async def get_historical_baseline(lat: float, lng: float, current_forecast: List[DailyWeatherItem]) -> List[HistoricalItem]:
        url = (
            f"https://power.larc.nasa.gov/api/temporal/climatology/point"
            f"?parameters=T2M,PRECTOTCORR,RH2M&community=ag"
            f"&longitude={lng}&latitude={lat}&format=json"
        )
        
        logger.info(f"Fetching historical climate data from NASA POWER for {lat}, {lng}...")
        
        # Default climatology values for Telangana (June/Summer averages)
        climatology = {
            "T2M": 32.5,          # degrees C mean
            "PRECTOTCORR": 4.5,   # mm/day baseline rainfall
            "RH2M": 62.0          # relative humidity percentage
        }
        
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FarmAlertForecaster"}
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    parameters = data.get("properties", {}).get("parameter", {})
                    
                    # Determine current month code
                    month_idx = datetime.now().month
                    month_codes = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
                    current_month_code = month_codes[month_idx - 1]
                    
                    if "T2M" in parameters:
                        climatology["T2M"] = parameters["T2M"].get(current_month_code, 32.5)
                    if "PRECTOTCORR" in parameters:
                        # NASA precipitation parameter is daily average in mm/day
                        climatology["PRECTOTCORR"] = parameters["PRECTOTCORR"].get(current_month_code, 4.5)
                    if "RH2M" in parameters:
                        climatology["RH2M"] = parameters["RH2M"].get(current_month_code, 62.0)
                    
                    logger.info("Successfully fetched climate baseline from NASA POWER.")
                else:
                    logger.warning(f"NASA POWER returned status {response.status_code}, using defaults...")
        except Exception as e:
            logger.error(f"Failed to fetch climate data from NASA POWER: {e}. Using baseline defaults...")

        return ClimateService._calculate_anomalies(current_forecast, climatology)

    @staticmethod
    def _calculate_anomalies(forecast: List[DailyWeatherItem], baseline: Dict[str, float]) -> List[HistoricalItem]:
        # Calculate 14-day average values from forecast
        avg_temp = sum(item.temp_max + item.temp_min for item in forecast) / (len(forecast) * 2.0)
        total_rain = sum(item.precipitation for item in forecast)
        avg_rain_daily = total_rain / len(forecast)
        avg_rh = sum(item.relative_humidity for item in forecast) / len(forecast)
        
        # Temp Anomaly
        temp_diff = avg_temp - baseline["T2M"]
        temp_val = f"+{temp_diff:.1f}°C above" if temp_diff >= 0 else f"{temp_diff:.1f}°C below"
        temp_color = "#dc2626" if temp_diff >= 2.0 else ("#d97706" if temp_diff >= 0.5 else "#16a34a")
        
        # Rain Anomaly (percentage deviation)
        # Prevent division by zero
        baseline_rain_daily = max(baseline["PRECTOTCORR"], 0.1)
        rain_diff_pct = ((avg_rain_daily - baseline_rain_daily) / baseline_rain_daily) * 100.0
        
        if rain_diff_pct >= 0:
            rain_val = f"+{rain_diff_pct:.0f}% above"
            rain_color = "#16a34a" if rain_diff_pct < 50.0 else "#2563eb" # high rain = flood/blue
        else:
            rain_val = f"−{abs(rain_diff_pct):.0f}% below"
            rain_color = "#dc2626" if rain_diff_pct <= -50.0 else "#d97706" # dry/warning
            
        # Humidity Anomaly
        rh_diff = avg_rh - baseline["RH2M"]
        rh_val = f"+{rh_diff:.0f}% above" if rh_diff >= 0 else f"−{abs(rh_diff):.0f}% below"
        rh_color = "#16a34a" if abs(rh_diff) < 10.0 else "#d97706"
        
        return [
            HistoricalItem(lbl="Temperature", te="ఉష్ణోగ్రత", val=temp_val, c=temp_color),
            HistoricalItem(lbl="Rainfall", te="వర్షపాతం", val=rain_val, c=rain_color),
            HistoricalItem(lbl="Humidity", te="తేమ శాతం", val=rh_val, c=rh_color)
        ]
