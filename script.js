/* =========================================================
   SkyCast — script.js
   Vanilla JS weather dashboard powered by Open-Meteo.

   NO API KEY NEEDED — Open-Meteo's free tier is fully open,
   no sign-up, no key, no rate-limit headaches for this kind
   of small app. Just type a city and search.
   ========================================================= */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DEFAULT_CITY = "Islamabad";

/* ---------- DOM references ---------- */
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const searchError = document.getElementById("searchError");

const loadingState = document.getElementById("loadingState");
const dashboard = document.getElementById("dashboard");

const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const dateToday = document.getElementById("dateToday");
const weatherIcon = document.getElementById("weatherIcon");
const conditionText = document.getElementById("conditionText");
const tempValue = document.getElementById("tempValue");
const feelsLike = document.getElementById("feelsLike");

const sunDot = document.getElementById("sunDot");
const sunriseLabel = document.getElementById("sunriseLabel");
const sunsetLabel = document.getElementById("sunsetLabel");

const detailsGrid = document.getElementById("detailsGrid");
const forecastGrid = document.getElementById("forecastGrid");

const navClock = document.getElementById("navClock");
const skyParticles = document.getElementById("skyParticles");

/* =========================================================
   Weather icon set (inline SVG, no external assets)
   ========================================================= */
function getWeatherIconSVG(main, isDay = true) {
  const icons = {
    Clear: isDay
      ? `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/>
          <line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/>
          <line x1="12" y1="12" x2="17.5" y2="17.5"/><line x1="46.5" y1="46.5" x2="52" y2="52"/>
          <line x1="52" y1="12" x2="46.5" y2="17.5"/><line x1="17.5" y1="46.5" x2="12" y2="52"/>
        </g></svg>`
      : `<svg viewBox="0 0 64 64"><path d="M42 12a18 18 0 1 0 10 32.7A22 22 0 0 1 42 12z" fill="currentColor"/></svg>`,
    Clouds: `<svg viewBox="0 0 64 64"><path d="M46 44H20a11 11 0 0 1-1-21.9A14 14 0 0 1 46 26.2 10 10 0 0 1 46 44z" fill="currentColor"/></svg>`,
    Rain: `<svg viewBox="0 0 64 64"><path d="M46 34H20a11 11 0 0 1-1-21.9A14 14 0 0 1 46 16.2 10 10 0 0 1 46 34z" fill="currentColor" opacity="0.85"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="22" y1="42" x2="19" y2="52"/><line x1="33" y1="42" x2="30" y2="52"/><line x1="44" y1="42" x2="41" y2="52"/></g></svg>`,
    Drizzle: `<svg viewBox="0 0 64 64"><path d="M46 32H20a11 11 0 0 1-1-21.9A14 14 0 0 1 46 14.2 10 10 0 0 1 46 32z" fill="currentColor" opacity="0.85"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="24" y1="40" x2="22" y2="46"/><line x1="34" y1="40" x2="32" y2="46"/><line x1="44" y1="40" x2="42" y2="46"/></g></svg>`,
    Thunderstorm: `<svg viewBox="0 0 64 64"><path d="M46 30H20a11 11 0 0 1-1-21.9A14 14 0 0 1 46 12.2 10 10 0 0 1 46 30z" fill="currentColor" opacity="0.85"/><path d="M34 34l-8 12h6l-4 10 12-14h-6l4-8z" fill="currentColor"/></svg>`,
    Snow: `<svg viewBox="0 0 64 64"><path d="M46 30H20a11 11 0 0 1-1-21.9A14 14 0 0 1 46 12.2 10 10 0 0 1 46 30z" fill="currentColor" opacity="0.85"/><g stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="24" y1="38" x2="24" y2="50"/><line x1="18.5" y1="41" x2="29.5" y2="47"/><line x1="29.5" y1="41" x2="18.5" y2="47"/><line x1="42" y1="38" x2="42" y2="50"/><line x1="36.5" y1="41" x2="47.5" y2="47"/><line x1="47.5" y1="41" x2="36.5" y2="47"/></g></svg>`,
    Mist: `<svg viewBox="0 0 64 64"><g stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="10" y1="24" x2="54" y2="24"/><line x1="16" y1="32" x2="54" y2="32"/><line x1="10" y1="40" x2="48" y2="40"/></g></svg>`,
  };
  return icons[main] || icons.Clouds;
}

/* =========================================================
   WMO weather code -> { main, description }
   Open-Meteo reports condition as a numeric WMO code instead
   of a text string, so we translate it here in one place.
   ========================================================= */
function mapWeatherCode(code) {
  const table = {
    0: { main: "Clear", description: "Clear sky" },
    1: { main: "Clear", description: "Mainly clear" },
    2: { main: "Clouds", description: "Partly cloudy" },
    3: { main: "Clouds", description: "Overcast" },
    45: { main: "Mist", description: "Fog" },
    48: { main: "Mist", description: "Depositing rime fog" },
    51: { main: "Drizzle", description: "Light drizzle" },
    53: { main: "Drizzle", description: "Moderate drizzle" },
    55: { main: "Drizzle", description: "Dense drizzle" },
    56: { main: "Drizzle", description: "Freezing drizzle" },
    57: { main: "Drizzle", description: "Dense freezing drizzle" },
    61: { main: "Rain", description: "Slight rain" },
    63: { main: "Rain", description: "Moderate rain" },
    65: { main: "Rain", description: "Heavy rain" },
    66: { main: "Rain", description: "Freezing rain" },
    67: { main: "Rain", description: "Heavy freezing rain" },
    71: { main: "Snow", description: "Slight snow fall" },
    73: { main: "Snow", description: "Moderate snow fall" },
    75: { main: "Snow", description: "Heavy snow fall" },
    77: { main: "Snow", description: "Snow grains" },
    80: { main: "Rain", description: "Slight rain showers" },
    81: { main: "Rain", description: "Moderate rain showers" },
    82: { main: "Rain", description: "Violent rain showers" },
    85: { main: "Snow", description: "Slight snow showers" },
    86: { main: "Snow", description: "Heavy snow showers" },
    95: { main: "Thunderstorm", description: "Thunderstorm" },
    96: { main: "Thunderstorm", description: "Thunderstorm with hail" },
    99: { main: "Thunderstorm", description: "Thunderstorm with heavy hail" },
  };
  return table[code] || { main: "Clouds", description: "Unsettled weather" };
}

/* =========================================================
   Theme mapping — updates the ambient sky + accent palette
   ========================================================= */
function updateWeatherTheme(main, isDay) {
  document.body.className = "";
  skyParticles.className = "sky-particles";

  let theme = "cloudy";
  if (!isDay) {
    theme = "night";
  } else if (main === "Clear") {
    theme = "sunny";
  } else if (["Rain", "Drizzle", "Thunderstorm"].includes(main)) {
    theme = "rain";
  } else if (main === "Snow") {
    theme = "snow";
  } else {
    theme = "cloudy";
  }

  if (theme === "rain") buildParticles(28);
  else if (theme === "snow") buildParticles(24, true);
  else skyParticles.innerHTML = "";

  document.body.classList.add(`theme-${theme}`);
}

function buildParticles(count, snowing = false) {
  skyParticles.classList.toggle("snowing", snowing);
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const duration = snowing ? 6 + Math.random() * 5 : 0.7 + Math.random() * 0.6;
    const delay = Math.random() * 5;
    html += `<span style="left:${left}%; animation-duration:${duration}s; animation-delay:${delay}s;"></span>`;
  }
  skyParticles.innerHTML = html;
}

/* =========================================================
   UI state helpers
   ========================================================= */
function showLoading() {
  loadingState.hidden = false;
  dashboard.hidden = true;
  searchError.hidden = true;
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching…";
}

function hideLoading() {
  loadingState.hidden = true;
  dashboard.hidden = false;
  searchBtn.disabled = false;
  searchBtn.textContent = "Search";
}

function showError(message) {
  loadingState.hidden = true;
  searchError.textContent = message;
  searchError.hidden = false;
  searchBtn.disabled = false;
  searchBtn.textContent = "Search";
  // keep the last successful dashboard visible instead of a blank screen
  dashboard.hidden = dashboard.dataset.hasData !== "true";
}

/* =========================================================
   Formatting helpers
   Open-Meteo returns local, timezone-adjusted ISO strings
   like "2026-08-18T14:32", so no manual UTC-offset math is
   needed — we just read the date/time parts straight off it.
   ========================================================= */
function toMinutesOfDay(isoString) {
  const timePart = isoString.split("T")[1]; // "14:32"
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + m;
}

function formatTimeFromISO(isoString) {
  const timePart = isoString.split("T")[1];
  let [hours, minutes] = timePart.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function localDateFromString(dateOrDateTime) {
  const datePart = dateOrDateTime.split("T")[0]; // "2026-08-18"
  return new Date(`${datePart}T00:00:00`);
}

function formatFullDate(dateOrDateTime) {
  return localDateFromString(dateOrDateTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDayLabel(dateStr) {
  return localDateFromString(dateStr).toLocaleDateString("en-US", { weekday: "long" });
}

function formatDateLabel(dateStr) {
  return localDateFromString(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function updateClock() {
  const now = new Date();
  navClock.textContent = now.toLocaleString("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   Rendering: current weather card
   ========================================================= */
function displayCurrentWeather(place, current) {
  const isDay = current.is_day === 1;
  const { main, description } = mapWeatherCode(current.weather_code);

  cityName.textContent = place.name;
  countryName.textContent = place.country || "";
  dateToday.textContent = formatFullDate(current.time);

  weatherIcon.innerHTML = getWeatherIconSVG(main, isDay);
  conditionText.textContent = description;

  tempValue.textContent = Math.round(current.temperature_2m);
  feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

  return { main, isDay };
}

function updateSunArc(nowISO, sunriseISO, sunsetISO) {
  sunriseLabel.textContent = formatTimeFromISO(sunriseISO);
  sunsetLabel.textContent = formatTimeFromISO(sunsetISO);

  const nowMin = toMinutesOfDay(nowISO);
  const sunriseMin = toMinutesOfDay(sunriseISO);
  const sunsetMin = toMinutesOfDay(sunsetISO);

  let progress = (nowMin - sunriseMin) / (sunsetMin - sunriseMin);
  progress = Math.min(1, Math.max(0, progress));

  // arc path: start (10,80) -> end (290,80), radius 140
  const angle = Math.PI * (1 - progress); // PI -> 0
  const cx = 150, cy = 80, r = 140;
  const x = cx - r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  sunDot.setAttribute("cx", x.toFixed(1));
  sunDot.setAttribute("cy", y.toFixed(1));
}

/* =========================================================
   Rendering: weather details grid
   ========================================================= */
function displayWeatherDetails(current, sunrise, sunset, visibilityMeters) {
  const items = [
    { icon: "💧", label: "Humidity", value: `${Math.round(current.relative_humidity_2m)}%` },
    { icon: "💨", label: "Wind speed", value: `${Math.round(current.wind_speed_10m)} km/h` },
    { icon: "🌡️", label: "Feels like", value: `${Math.round(current.apparent_temperature)}°C` },
    { icon: "👁️", label: "Visibility", value: visibilityMeters != null ? `${(visibilityMeters / 1000).toFixed(1)} km` : "—" },
    { icon: "🌅", label: "Sunrise", value: formatTimeFromISO(sunrise) },
    { icon: "🌇", label: "Sunset", value: formatTimeFromISO(sunset) },
    { icon: "📊", label: "Pressure", value: `${Math.round(current.surface_pressure)} hPa` },
    { icon: "☁️", label: "Cloudiness", value: `${Math.round(current.cloud_cover)}%` },
  ];

  detailsGrid.innerHTML = items
    .map(
      (item) => `
      <div class="detail-card">
        <span class="detail-icon">${item.icon}</span>
        <span class="detail-label">${item.label}</span>
        <span class="detail-value">${item.value}</span>
      </div>`
    )
    .join("");
}

/* =========================================================
   Rendering: 5-day forecast
   ========================================================= */
function displayForecast(daily) {
  const days = Math.min(5, daily.time.length);
  let html = "";

  for (let i = 0; i < days; i++) {
    const { main, description } = mapWeatherCode(daily.weather_code[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);

    html += `
      <div class="forecast-card">
        <span class="forecast-day">${formatDayLabel(daily.time[i])}</span>
        <span class="forecast-date">${formatDateLabel(daily.time[i])}</span>
        <span class="forecast-icon">${getWeatherIconSVG(main, true)}</span>
        <span class="forecast-temps">${max}° <span class="min">/ ${min}°</span></span>
        <span class="forecast-condition">${description}</span>
      </div>`;
  }

  forecastGrid.innerHTML = html;
}

/* =========================================================
   Fetching
   ========================================================= */
async function geocodeCity(city) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API_ERROR");

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("CITY_NOT_FOUND");
  }
  return data.results[0];
}

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure,cloud_cover",
    hourly: "visibility",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "5",
  });

  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("API_ERROR");

  const data = await res.json();
  if (!data.current || !data.daily) throw new Error("INVALID_RESPONSE");
  return data;
}

function findClosestVisibility(hourly, nowISO) {
  if (!hourly || !hourly.time) return null;
  const nowMs = new Date(nowISO).getTime();
  let closestIndex = 0;
  let smallestDiff = Infinity;

  hourly.time.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - nowMs);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = i;
    }
  });

  return hourly.visibility ? hourly.visibility[closestIndex] : null;
}

async function getWeather(city) {
  if (!city || !city.trim()) {
    showError("Please enter a city name to search.");
    return;
  }

  showLoading();

  try {
    const place = await geocodeCity(city.trim());
    const data = await fetchForecast(place.latitude, place.longitude);

    const { current, daily, hourly } = data;
    const visibility = findClosestVisibility(hourly, current.time);

    const { main, isDay } = displayCurrentWeather(place, current);
    updateSunArc(current.time, daily.sunrise[0], daily.sunset[0]);
    displayWeatherDetails(current, daily.sunrise[0], daily.sunset[0], visibility);
    displayForecast(daily);
    updateWeatherTheme(main, isDay);

    dashboard.dataset.hasData = "true";
    hideLoading();
  } catch (err) {
    handleFetchError(err);
  }
}

function handleFetchError(err) {
  if (!navigator.onLine) {
    showError("You appear to be offline. Please check your network connection.");
    return;
  }
  switch (err.message) {
    case "CITY_NOT_FOUND":
      showError("City not found. Please check the city name and try again.");
      break;
    case "API_ERROR":
      showError("The weather service is unavailable right now. Please try again shortly.");
      break;
    case "INVALID_RESPONSE":
      showError("Received an unexpected response. Please try a different city.");
      break;
    default:
      showError("Something went wrong while fetching the weather. Please try again.");
  }
}

/* =========================================================
   Event listeners
   ========================================================= */
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  getWeather(cityInput.value);
});

/* =========================================================
   Init
   ========================================================= */
updateClock();
setInterval(updateClock, 30000);
getWeather(DEFAULT_CITY);
