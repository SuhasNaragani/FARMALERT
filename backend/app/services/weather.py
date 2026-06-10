import httpx
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models import DailyWeatherItem

logger = logging.getLogger("farmalert.weather")

class WeatherService:
    @staticmethod
    async def get_14day_forecast(lat: float, lng: float) -> List[DailyWeatherItem]:
        # daily= accepts only true daily aggregates.
        # relativehumidity_2m and soil_moisture_0_to_7cm are hourly-only —
        # they go in hourly= and are averaged per day below.
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
            f"precipitation_probability_max,windspeed_10m_max,uv_index_max,"
            f"et0_fao_evapotranspiration"
            f"&hourly=relativehumidity_2m,soil_moisture_0_to_7cm"
            f"&forecast_days=14&timezone=Asia/Kolkata"
        )

        print(f"Fetching weather for: {lat}, {lng}")
        logger.info(f"Fetching Open-Meteo forecast for lat={lat}, lng={lng}")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers={"User-Agent": "FarmAlert/1.0"})
                print(f"Open-Meteo status: {response.status_code}")

                if response.status_code == 200:
                    data      = response.json()
                    daily     = data.get("daily", {})
                    hourly    = data.get("hourly", {})

                    times     = daily.get("time", [])
                    t_max     = daily.get("temperature_2m_max", [])
                    t_min     = daily.get("temperature_2m_min", [])
                    precip    = daily.get("precipitation_sum", [])
                    wind      = daily.get("windspeed_10m_max", [])
                    uv        = daily.get("uv_index_max", [])
                    et        = daily.get("et0_fao_evapotranspiration", [])

                    rh_h      = hourly.get("relativehumidity_2m", [])
                    sm_h      = hourly.get("soil_moisture_0_to_7cm", [])

                    def day_avg(arr, day_idx):
                        chunk = [x for x in arr[day_idx * 24:(day_idx + 1) * 24] if x is not None]
                        return sum(chunk) / len(chunk) if chunk else None

                    weather_items = []
                    for i in range(len(times)):
                        rh_val = day_avg(rh_h, i)
                        sm_val = day_avg(sm_h, i)
                        weather_items.append(
                            DailyWeatherItem(
                                day=f"D{i+1}",
                                date=times[i],
                                temp_max=float(t_max[i])  if i < len(t_max)  and t_max[i]  is not None else 32.0,
                                temp_min=float(t_min[i])  if i < len(t_min)  and t_min[i]  is not None else 24.0,
                                precipitation=float(precip[i]) if i < len(precip) and precip[i] is not None else 0.0,
                                soil_moisture=float(sm_val) if sm_val is not None else 0.32,
                                wind_speed=float(wind[i]) if i < len(wind)   and wind[i]   is not None else 18.0,
                                uv_index=float(uv[i])     if i < len(uv)     and uv[i]     is not None else 8.0,
                                evapotranspiration=float(et[i]) if i < len(et) and et[i]   is not None else 4.2,
                                relative_humidity=float(rh_val) if rh_val is not None else 65.0,
                            )
                        )

                    print(f"First day temp: {weather_items[0].temp_max if weather_items else 'N/A'}")
                    logger.info(f"Fetched {len(weather_items)}-day real forecast from Open-Meteo.")
                    return weather_items
                else:
                    print(f"Open-Meteo error {response.status_code}: {response.text[:400]}")
                    logger.warning(f"Open-Meteo returned {response.status_code}, falling back to mock.")
        except Exception as e:
            print(f"Open-Meteo exception: {e}")
            logger.error(f"Open-Meteo fetch failed: {e}. Falling back to mock.")

        return WeatherService._generate_mock_forecast(lat, lng)

    @staticmethod
    def _generate_mock_forecast(lat: float, lng: float) -> List[DailyWeatherItem]:
        # Generate simulated Telangana summer/monsoon weather
        today = datetime.now()
        weather_items = []
        
        # High temperatures (approx 41C max, 28C min, dry days with small humidity)
        for i in range(14):
            day_date = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            # Create a weather pattern with a slight peak and a late rain event
            temp_max = 38.0 + (i % 4) * 1.0
            if i in [12, 13]: # Peak heatwave days
                temp_max = 41.0
            temp_min = 26.0 + (i % 3) * 0.8
            
            # Simulated sparse rainfall (mostly 0, slight rain on day 6)
            precipitation = 0.0
            if i == 5:
                precipitation = 20.0  # slight rainfall event
            elif i == 6:
                precipitation = 10.0
                
            soil_moisture = 0.38 - (i * 0.01) # dropping over time
            if i >= 5: # recovers slightly after rain
                soil_moisture += 0.05
                
            wind_speed = 15.0 + (i % 5) * 1.5
            uv_index = 8.2 if i % 2 == 0 else 7.8
            evapotranspiration = 4.2 if i < 10 else 4.5
            relative_humidity = 68.0 - (i % 4) * 2.0
            if i in [5, 6]:
                relative_humidity = 82.0 # high humidity during rain
                
            weather_items.append(
                DailyWeatherItem(
                    day=f"D{i+1}",
                    date=day_date,
                    temp_max=round(temp_max, 1),
                    temp_min=round(temp_min, 1),
                    precipitation=round(precipitation, 1),
                    soil_moisture=round(soil_moisture, 2),
                    wind_speed=round(wind_speed, 1),
                    uv_index=round(uv_index, 1),
                    evapotranspiration=round(evapotranspiration, 1),
                    relative_humidity=round(relative_humidity, 1),
                )
            )
        return weather_items
