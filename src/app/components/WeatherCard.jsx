
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { fetchWeatherData, getEnvironmentalRecommendations } from '@/app/services/weatherService';
import { Loader2, Droplets, Sun, Thermometer, MapPin } from 'lucide-react';

export const WeatherCard: React.FC = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWeather = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWeatherData();
      setWeather(data);
    } catch (loadError) {
      console.error('Failed to fetch weather data', loadError);
      setError('Could not load live weather right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  if (loading) {
    return (
      <Card className="border-none shadow-md bg-white/90 backdrop-blur">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-md bg-white/90 backdrop-blur">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            type="button"
            onClick={loadWeather}
            className="text-sm text-purple-600 hover:text-purple-700 underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const recommendations = getEnvironmentalRecommendations(weather);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'extreme':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{weather.location}</span>
              </div>
              <h3 className="text-2xl text-slate-800">Local Weather Impact</h3>
            </div>
            <div className="text-5xl">{weather.icon}</div>
          </div>

          {/* Weather Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <Thermometer className="w-5 h-5 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl text-slate-800">{weather.temp} F</p>
              <p className="text-xs text-slate-600">Temperature</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <Droplets className="w-5 h-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl text-slate-800">{weather.humidity}%</p>
              <p className="text-xs text-slate-600">Humidity</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <Sun className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl text-slate-800">{weather.uvIndex}</p>
              <p className="text-xs text-slate-600">UV Index</p>
            </div>
          </div>

          {/* Environmental Recommendations */}
          <div className="space-y-3">
            <p className="text-sm text-slate-700 mb-3">
              <strong>Today's Skincare Adjustments:</strong>
            </p>
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-white/80 rounded-lg"
              >
                <Badge variant="outline" className={`${getLevelColor(rec.level)} mt-0.5`}>
                  {rec.factor}
                </Badge>
                <p className="text-sm text-slate-700 flex-1">{rec.advice}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Tip:</strong> Weather conditions are updated in real time for your environment.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};


