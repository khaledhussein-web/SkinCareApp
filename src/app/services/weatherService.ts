// Weather service to fetch environmental data
// In production, this would use OpenWeatherMap API: https://api.openweathermap.org/data/2.5/weather

export interface WeatherData {
  temp: number;
  humidity: number;
  uvIndex: number;
  condition: string;
  icon: string;
  location: string;
}

export interface SkinCareRecommendation {
  factor: string;
  level: 'low' | 'moderate' | 'high' | 'extreme';
  advice: string;
}

// Mock weather data based on realistic patterns
const mockWeatherData: WeatherData[] = [
  {
    temp: 75,
    humidity: 45,
    uvIndex: 7,
    condition: 'Sunny',
    icon: '☀️',
    location: 'San Francisco, CA',
  },
  {
    temp: 82,
    humidity: 65,
    uvIndex: 9,
    condition: 'Hot & Humid',
    icon: '🌡️',
    location: 'Miami, FL',
  },
  {
    temp: 68,
    humidity: 55,
    uvIndex: 5,
    condition: 'Partly Cloudy',
    icon: '⛅',
    location: 'Seattle, WA',
  },
  {
    temp: 58,
    humidity: 35,
    uvIndex: 3,
    condition: 'Cool & Dry',
    icon: '🌤️',
    location: 'Boston, MA',
  },
];

export const fetchWeatherData = async (): Promise<WeatherData> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In production, you would use:
  // const API_KEY = 'your_openweathermap_api_key';
  // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=city&appid=${API_KEY}`);
  // const data = await response.json();

  // For demo, return random weather data
  const randomWeather = mockWeatherData[Math.floor(Math.random() * mockWeatherData.length)];
  return randomWeather;
};

export const getEnvironmentalRecommendations = (
  weather: WeatherData
): SkinCareRecommendation[] => {
  const recommendations: SkinCareRecommendation[] = [];

  // UV Index recommendations
  if (weather.uvIndex >= 8) {
    recommendations.push({
      factor: 'UV Index',
      level: 'extreme',
      advice: 'Use SPF 50+ sunscreen and reapply every 2 hours. Wear protective clothing.',
    });
  } else if (weather.uvIndex >= 6) {
    recommendations.push({
      factor: 'UV Index',
      level: 'high',
      advice: 'Apply SPF 30+ sunscreen before going outside. Seek shade during peak hours.',
    });
  } else if (weather.uvIndex >= 3) {
    recommendations.push({
      factor: 'UV Index',
      level: 'moderate',
      advice: 'Use daily SPF 30 moisturizer for protection.',
    });
  }

  // Humidity recommendations
  if (weather.humidity >= 70) {
    recommendations.push({
      factor: 'Humidity',
      level: 'high',
      advice: 'Use lightweight, oil-free products. Your skin needs less heavy moisturization.',
    });
  } else if (weather.humidity <= 30) {
    recommendations.push({
      factor: 'Humidity',
      level: 'low',
      advice: 'Use richer moisturizers and add a hydrating serum. Consider a humidifier indoors.',
    });
  } else {
    recommendations.push({
      factor: 'Humidity',
      level: 'moderate',
      advice: 'Current humidity is ideal for skin. Maintain your regular routine.',
    });
  }

  // Temperature recommendations
  if (weather.temp >= 80) {
    recommendations.push({
      factor: 'Temperature',
      level: 'high',
      advice:
        'Hot weather can increase oil production. Use gentle, foaming cleansers and mattifying products.',
    });
  } else if (weather.temp <= 60) {
    recommendations.push({
      factor: 'Temperature',
      level: 'low',
      advice:
        'Cold weather can dry out skin. Use barrier-protecting creams and avoid hot showers.',
    });
  }

  return recommendations;
};

export const getSPFRecommendation = (uvIndex: number): string => {
  if (uvIndex >= 8) return 'SPF 50+';
  if (uvIndex >= 6) return 'SPF 30-50';
  if (uvIndex >= 3) return 'SPF 30';
  return 'SPF 15-30';
};
