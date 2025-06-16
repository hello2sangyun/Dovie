import { useState, useEffect } from 'react';

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  description: string;
  icon: string;
}

interface WeatherCondition {
  background: string;
  overlay: string;
  particles?: string;
}

export const getWeatherBackground = (condition: string): WeatherCondition => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    return {
      background: 'bg-gradient-to-br from-gray-400/20 via-blue-400/20 to-slate-500/20',
      overlay: 'bg-rain-pattern opacity-30',
      particles: 'rain'
    };
  }
  
  if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
    return {
      background: 'bg-gradient-to-br from-blue-100/30 via-white/20 to-gray-200/30',
      overlay: 'bg-snow-pattern opacity-25',
      particles: 'snow'
    };
  }
  
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    return {
      background: 'bg-gradient-to-br from-gray-200/20 via-slate-300/15 to-gray-400/20',
      overlay: 'bg-cloud-pattern opacity-20'
    };
  }
  
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
    return {
      background: 'bg-gradient-to-br from-yellow-200/20 via-orange-200/15 to-blue-200/20',
      overlay: 'bg-sun-pattern opacity-15'
    };
  }
  
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
    return {
      background: 'bg-gradient-to-br from-purple-400/25 via-gray-600/20 to-indigo-500/25',
      overlay: 'bg-storm-pattern opacity-30'
    };
  }
  
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    return {
      background: 'bg-gradient-to-br from-gray-300/20 via-white/15 to-slate-300/20',
      overlay: 'bg-fog-pattern opacity-20'
    };
  }
  
  // 기본값 - 맑은 날씨
  return {
    background: 'bg-gradient-to-br from-blue-100/15 via-white/10 to-sky-200/15',
    overlay: 'bg-default-pattern opacity-10'
  };
};

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // OpenWeatherMap API 호출 (무료 API)
      const API_KEY = process.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        throw new Error('날씨 API 키가 설정되지 않았습니다.');
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      if (!response.ok) {
        throw new Error('날씨 정보를 가져올 수 없습니다.');
      }
      
      const data = await response.json();
      
      setWeather({
        location: data.name,
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      // 기본 날씨 설정 (API 실패 시)
      setWeather({
        location: '현재 위치',
        temperature: 20,
        condition: 'Clear',
        description: '맑음',
        icon: '01d'
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWeather = () => {
    // 위치 권한 요청 없이 기본 날씨 정보 설정
    setWeather({
      location: '서울',
      temperature: 20,
      condition: 'Clear',
      description: '맑음',
      icon: '01d'
    });
  };

  useEffect(() => {
    getDefaultWeather();
  }, []);

  return {
    weather,
    loading,
    error,
    refreshWeather: getDefaultWeather
  };
}