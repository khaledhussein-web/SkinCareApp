const DEFAULT_LOCATION = {
  latitude: 33.8938,
  longitude: 35.5018,
  label: "Beirut, Lebanon",
};

const locationLabelCache = new Map();

function mapWeatherCodeToCondition(code) {
  if (code === 0) return { condition: "Clear Sky", icon: "\u2600\uFE0F" };
  if ([1, 2].includes(code)) return { condition: "Partly Cloudy", icon: "\u26C5" };
  if (code === 3) return { condition: "Cloudy", icon: "\u2601\uFE0F" };
  if ([45, 48].includes(code)) return { condition: "Fog", icon: "\uD83C\uDF2B\uFE0F" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", icon: "\uD83C\uDF26\uFE0F" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rain", icon: "\uD83C\uDF27\uFE0F" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snow", icon: "\u2744\uFE0F" };
  if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm", icon: "\u26C8\uFE0F" };
  return { condition: "Unknown", icon: "\uD83C\uDF24\uFE0F" };
}

function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

async function resolveCityCountryLabel(latitude, longitude, fallbackLabel) {
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (locationLabelCache.has(cacheKey)) {
    return locationLabelCache.get(cacheKey);
  }

  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("localityLanguage", "en");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const data = await response.json();
    const city = data?.city || data?.locality || data?.principalSubdivision || null;
    const country = data?.countryName || null;

    const label = city && country ? `${city}, ${country}` : fallbackLabel;
    locationLabelCache.set(cacheKey, label);
    return label;
  } catch (_error) {
    locationLabelCache.set(cacheKey, fallbackLabel);
    return fallbackLabel;
  }
}

function getCurrentPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(DEFAULT_LOCATION);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: `Lat ${position.coords.latitude.toFixed(2)}, Lon ${position.coords.longitude.toFixed(2)}`,
        });
      },
      () => resolve(DEFAULT_LOCATION),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

export const fetchWeatherData = async () => {
  const location = await getCurrentPosition();
  const locationLabel = await resolveCityCountryLabel(location.latitude, location.longitude, location.label);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,uv_index,weather_code");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to fetch live weather data");
  }

  const data = await response.json();
  if (!data?.current) {
    throw new Error("Weather API returned invalid data");
  }

  const current = data.current;
  const weatherMeta = mapWeatherCodeToCondition(Number(current.weather_code));

  return {
    temp: celsiusToFahrenheit(Number(current.temperature_2m || 0)),
    humidity: Math.round(Number(current.relative_humidity_2m || 0)),
    uvIndex: Math.round(Number(current.uv_index || 0)),
    condition: weatherMeta.condition,
    icon: weatherMeta.icon,
    location: locationLabel,
    fetchedAt: new Date().toISOString(),
  };
};

export const getEnvironmentalRecommendations = (weather) => {
  const recommendations = [];

  if (weather.uvIndex >= 8) {
    recommendations.push({
      factor: "UV Index",
      level: "extreme",
      advice: "Use SPF 50+ sunscreen and reapply every 2 hours. Wear protective clothing.",
    });
  } else if (weather.uvIndex >= 6) {
    recommendations.push({
      factor: "UV Index",
      level: "high",
      advice: "Apply SPF 30+ sunscreen before going outside. Seek shade during peak hours.",
    });
  } else if (weather.uvIndex >= 3) {
    recommendations.push({
      factor: "UV Index",
      level: "moderate",
      advice: "Use daily SPF 30 moisturizer for protection.",
    });
  } else {
    recommendations.push({
      factor: "UV Index",
      level: "low",
      advice: "UV is low, but a light daily SPF is still recommended to protect skin health.",
    });
  }

  if (weather.humidity >= 70) {
    recommendations.push({
      factor: "Humidity",
      level: "high",
      advice: "Use lightweight, oil-free products. Your skin needs less heavy moisturization.",
    });
  } else if (weather.humidity <= 30) {
    recommendations.push({
      factor: "Humidity",
      level: "low",
      advice: "Use richer moisturizers and add a hydrating serum. Consider a humidifier indoors.",
    });
  } else {
    recommendations.push({
      factor: "Humidity",
      level: "moderate",
      advice: "Current humidity is ideal for skin. Maintain your regular routine.",
    });
  }

  if (weather.temp >= 80) {
    recommendations.push({
      factor: "Temperature",
      level: "high",
      advice:
        "Hot weather can increase oil production. Use gentle, foaming cleansers and mattifying products.",
    });
  } else if (weather.temp <= 60) {
    recommendations.push({
      factor: "Temperature",
      level: "low",
      advice: "Cold weather can dry out skin. Use barrier-protecting creams and avoid hot showers.",
    });
  } else {
    recommendations.push({
      factor: "Temperature",
      level: "moderate",
      advice: "Mild weather supports skin balance. Maintain a simple cleanse-moisturize-SPF routine.",
    });
  }

  return recommendations;
};

export const getSPFRecommendation = (uvIndex) => {
  if (uvIndex >= 8) return "SPF 50+";
  if (uvIndex >= 6) return "SPF 30-50";
  if (uvIndex >= 3) return "SPF 30";
  return "SPF 15-30";
};
