import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import HTTPException  # pyright: ignore[reportMissingImports]

BASE_DIR = Path(__file__).parent.parent.parent


def load_env_file() -> None:
    for env_path in (BASE_DIR / ".env", BASE_DIR / ".env.local"):
        if not env_path.exists():
            continue

        for line in env_path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


CITY_QUERY = {
    "tel aviv": "Tel Aviv,IL",
    "jerusalem": "Jerusalem,IL",
    "haifa": "Haifa,IL",
    "be'er sheva": "Beersheba,IL",
    "beer sheva": "Beersheba,IL",
    "eilat": "Eilat,IL",
    "netanya": "Netanya,IL",
    "ra'anana": "Raanana,IL",
    "raanana": "Raanana,IL",
    "herzliya": "Herzliya,IL",
    "rehovot": "Rehovot,IL",
    "ashdod": "Ashdod,IL",
    "ashkelon": "Ashkelon,IL",
    "tiberias": "Tiberias,IL",
    "nazareth": "Nazareth,IL",
    "kfar saba": "Kfar Saba,IL",
    "petah tikva": "Petah Tikva,IL",
}


def city_query(city: str) -> str:
    return CITY_QUERY.get(city.strip().lower(), f"{city},IL")


def estimated_uv_index(weather: dict) -> int:
    clouds = weather.get("clouds", {}).get("all", 0)
    current_time = weather.get("dt", 0)
    sunrise = weather.get("sys", {}).get("sunrise", 0)
    sunset = weather.get("sys", {}).get("sunset", 0)

    if sunrise and sunset and not (sunrise <= current_time <= sunset):
        return 0

    clear_sky_uv = 8
    cloud_factor = max(0.25, 1 - (float(clouds) / 100 * 0.65))
    return round(clear_sky_uv * cloud_factor)


def rainfall_mm(weather: dict) -> float:
    rain = weather.get("rain") or {}
    snow = weather.get("snow") or {}
    return round(float(rain.get("1h") or rain.get("3h") or snow.get("1h") or snow.get("3h") or 0), 1)


def get_current_weather(city: str) -> dict:
    load_env_file()
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENWEATHERMAP_API_KEY is missing. Add it to .env or .env.local and restart the backend.",
        )

    params = urlencode({
        "q": city_query(city),
        "appid": api_key,
        "units": "metric",
    })
    url = f"https://api.openweathermap.org/data/2.5/weather?{params}"

    try:
        with urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8") or str(error)
        raise HTTPException(status_code=error.code, detail=detail) from error
    except URLError as error:
        raise HTTPException(status_code=502, detail=f"Weather API unreachable: {error.reason}") from error
    except TimeoutError as error:
        raise HTTPException(status_code=504, detail="Weather API request timed out") from error

    main = payload.get("main", {})
    descriptions = payload.get("weather") or [{}]

    return {
        "city": payload.get("name") or city,
        "temperature": round(float(main.get("temp", 0)), 1),
        "humidity": int(main.get("humidity", 0)),
        "rainfall": rainfall_mm(payload),
        "uv_index": estimated_uv_index(payload),
        "description": descriptions[0].get("description", "Current weather"),
        "adjustment_note": "Live OpenWeatherMap data is active.",
    }
