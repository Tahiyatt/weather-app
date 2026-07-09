
/* =========================================================
   Weather App
   Data:  OpenWeatherMap (current weather + 5 day / 3 hour forecast)
   Map:   Leaflet + OpenStreetMap tiles (no key required)
   ========================================================= */

// TODO: paste your OpenWeatherMap API key here (free tier works fine)
const apiKey = API_KEY;

// Default starting location: New York City
let currentLat = 40.712772;
let currentLon = -74.006058;
let currentLabel = "New York, US";


const els = {
    locationName: document.querySelector("#location-name"),
    currTime: document.querySelector("#curr-time"),
    currentCondition: document.querySelector("#current-condition"),
    currentTemp: document.querySelector("#current-temp"),
    currentFeels: document.querySelector("#current-feels"),
    currentIcon: document.querySelector("#current-icon"),
    weekScroller: document.querySelector("#week-forecast-scroller"),
    hourScroller: document.querySelector("#hourly-forecast-scroller"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
};

// ---------- Condition -> local image / color mapping ----------
// Maps OpenWeatherMap's "main" condition field (and day/night) to the
// images already sitting in background-images/, plus a solid accent
// color used for the weekly forecast cards.
function getConditionAssets(main, iconCode) {
    const isNight = iconCode && iconCode.endsWith("n");
    const key = (main || "").toLowerCase();

    const table = {
        clear: {
            file: isNight ? "clear-night.jpg" : "clear-day.jpg",
            color: isNight ? "rgba(30,40,90,0.85)" : "rgba(60,140,220,0.85)",
        },
        clouds: {
            file: "partly-cloudy.jpg",
            color: "rgba(100,110,120,0.85)",
        },
        mist: { file: "foggy.jpg", color: "rgba(120,120,120,0.85)" },
        smoke: { file: "foggy.jpg", color: "rgba(120,120,120,0.85)" },
        haze: { file: "foggy.jpg", color: "rgba(120,120,120,0.85)" },
        fog: { file: "foggy.jpg", color: "rgba(120,120,120,0.85)" },
        dust: { file: "foggy.jpg", color: "rgba(150,130,90,0.85)" },
        rain: { file: "rain.jpg", color: "rgba(50,80,130,0.85)" },
        drizzle: { file: "rain.jpg", color: "rgba(60,90,140,0.85)" },
        snow: { file: "snow.jpg", color: "rgba(140,160,190,0.85)" },
        thunderstorm: { file: "thunder-storm.jpg", color: "rgba(45,45,60,0.9)" },
    };

    return table[key] || table.clear;
}

// helpers 
function kToF(kelvin) {
    return Math.round(((kelvin - 273.15) * 9) / 5 + 32);
}

function formatDayLabel(date, index) {
    if (index === 0) return "Today";
    return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatHourLabel(date) {
    return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

// API calls 
async function geocodeLocation(query) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        query
    )}&limit=1&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding request failed");
    const data = await res.json();
    if (!data.length) throw new Error(`No location found for "${query}"`);
    return {
        lat: data[0].lat,
        lon: data[0].lon,
        label: [data[0].name, data[0].state, data[0].country].filter(Boolean).join(", "),
    };
}

async function getCurrentWeather(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Current weather request failed");
    return res.json();
}

// Free-tier endpoint: 5 day forecast in 3-hour steps.
async function getForecast(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast request failed");
    return res.json();
}

//  Rendering 
function renderCurrentWeather(data) {
    const now = new Date();
    els.currTime.textContent = "Current time: " + now.toLocaleTimeString();

    const condition = data.weather[0].main;
    const description = data.weather[0].description;
    els.currentCondition.textContent = condition;
    els.currentTemp.textContent = kToF(data.main.temp) + "°F";
    els.currentFeels.textContent =
        "Feels like " + kToF(data.main.feels_like) + "°F · " + description;

    const assets = getConditionAssets(condition, data.weather[0].icon);
    els.currentIcon.src = `background-images/${assets.file}`;
    els.currentIcon.alt = condition;

    // Swap the page background to match current conditions.
    document.body.style.backgroundImage = `url("background-images/${assets.file}")`;

    els.locationName.textContent = "Location: " + currentLabel;
}

function renderWeeklyForecast(forecastData) {
    // Group the 3-hour entries by calendar day, keep min/max temp and
    // the entry closest to midday to represent that day's icon/condition.
    const byDay = new Map();

    forecastData.list.forEach((entry) => {
        const date = new Date(entry.dt * 1000);
        const dayKey = date.toISOString().slice(0, 10);
        const hour = date.getHours();

        if (!byDay.has(dayKey)) {
            byDay.set(dayKey, { date, entries: [] });
        }
        byDay.get(dayKey).entries.push({ entry, hour });
    });

    els.weekScroller.innerHTML = "";

    Array.from(byDay.values())
        .slice(0, 7)
        .forEach((day, index) => {
            const temps = day.entries.map((e) => e.entry.main.temp);
            const hi = Math.max(...temps);
            const lo = Math.min(...temps);

            // pick the entry nearest to noon as representative
            const rep = day.entries.reduce((best, e) =>
                Math.abs(e.hour - 12) < Math.abs(best.hour - 12) ? e : best
            ).entry;

            const condition = rep.weather[0].main;
            const assets = getConditionAssets(condition, rep.weather[0].icon);

            const card = document.createElement("div");
            card.className = "day-card";
            card.style.backgroundColor = assets.color;
            card.innerHTML = `
                <p class="day-name">${formatDayLabel(day.date, index)}</p>
                <img src="background-images/${assets.file}" alt="${condition}">
                <p class="day-condition">${condition}</p>
                <p class="day-temp">${kToF(hi)}° <span class="lo">${kToF(lo)}°</span></p>
            `;
            els.weekScroller.appendChild(card);
        });
}

function renderHourlyForecast(forecastData) {
    // Free tier only gives 3-hour steps, so show the next 24-48h available.
    els.hourScroller.innerHTML = "";

    forecastData.list.slice(0, 16).forEach((entry) => {
        const date = new Date(entry.dt * 1000);
        const condition = entry.weather[0].main;
        const assets = getConditionAssets(condition, entry.weather[0].icon);

        const card = document.createElement("div");
        card.className = "hour-card";
        card.innerHTML = `
            <p class="hour-label">${formatHourLabel(date)}</p>
            <img src="background-images/${assets.file}" alt="${condition}">
            <p class="hour-temp">${kToF(entry.main.temp)}°</p>
        `;
        els.hourScroller.appendChild(card);
    });
}

// Map 
let map;
let marker;

function initMap(lat, lon) {
    map = L.map("map", {
        scrollWheelZoom: true,
        dragging: true,
    }).setView([lat, lon], 9);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
    }).addTo(map);

    marker = L.marker([lat, lon]).addTo(map);
}

function updateMap(lat, lon, label) {
    if (!map) {
        initMap(lat, lon);
        return;
    }
    map.setView([lat, lon], 9);
    marker.setLatLng([lat, lon]);
    marker.bindPopup(label).openPopup();
}

// ---------- Orchestration ----------
async function loadWeatherFor(lat, lon, label) {
    try {
        currentLat = lat;
        currentLon = lon;
        currentLabel = label;

        const [current, forecast] = await Promise.all([
            getCurrentWeather(lat, lon),
            getForecast(lat, lon),
        ]);

        renderCurrentWeather(current);
        renderWeeklyForecast(forecast);
        renderHourlyForecast(forecast);
        updateMap(lat, lon, label);
    } catch (err) {
        console.error(err);
        els.currentCondition.textContent = "Couldn't load weather";
        els.currentTemp.textContent = err.message.includes("401")
            ? "Check your API key"
            : err.message;
    }
}

els.searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = els.searchInput.value.trim();
    if (!query) return;

    try {
        const { lat, lon, label } = await geocodeLocation(query);
        await loadWeatherFor(lat, lon, label);
        els.searchInput.value = "";
    } catch (err) {
        console.error(err);
        els.locationName.textContent = "Location: not found";
    }
});

// Init 
loadWeatherFor(currentLat, currentLon, currentLabel);