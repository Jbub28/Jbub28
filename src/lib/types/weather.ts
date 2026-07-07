/** Weather types for real-time and forecast risk assessment */

export type WeatherSeverity = "none" | "low" | "medium" | "high" | "severe";

export interface CurrentWeather {
  lat: number;
  lng: number;
  fetchedAt: string;
  source: "open-meteo" | "cache" | "offline";
  temperatureF: number;
  humidityPercent: number;
  precipitationMm: number;
  rainMm: number;
  windSpeedMph: number;
  windGustMph: number;
  weatherCode: number;
  weatherLabel: string;
  isRaining: boolean;
  isSnowing: boolean;
  isFog: boolean;
  isThunderstorm: boolean;
  isSevere: boolean;
}

export interface WeatherRiskAssessment {
  score: number;
  severity: WeatherSeverity;
  factors: string[];
  recommendation?: string;
}

export interface RouteWeatherSnapshot {
  origin: CurrentWeather | null;
  destination: CurrentWeather | null;
  alongRoute: CurrentWeather[];
  aggregate: WeatherRiskAssessment;
  fetchedAt: string;
}

export interface RadarFrame {
  path: string;
  timestamp: number;
}

export interface RadarMetadata {
  host: string;
  frames: RadarFrame[];
  fetchedAt: string;
}
