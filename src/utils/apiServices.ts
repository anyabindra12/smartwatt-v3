
import { SolarForecast } from "../mock/data";

// Interface for Solcast API response
interface SolcastForecastResponse {
  forecasts: Array<{
    period_end: string;
    period: string;
    pv_estimate: number;
  }>;
}

// Function to fetch solar forecast from Solcast API
export const fetchSolarForecast = async (
  apiKey: string,
  resourceId: string
): Promise<SolarForecast[]> => {
  try {
    // Construct the API URL
    const url = `https://api.solcast.com.au/rooftop_sites/${resourceId}/forecasts?format=json&api_key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Solcast API error: ${response.status}`);
    }
    
    const data: SolcastForecastResponse = await response.json();
    
    // Convert the API response to our app's format
    // Solcast returns 30-minute intervals, we'll aggregate to hourly
    const hourlyForecasts = new Map<string, number>();
    
    data.forecasts.forEach(forecast => {
      // Extract hour from period_end
      const date = new Date(forecast.period_end);
      const hour = date.getHours();
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      
      // Add to the existing power value or set it
      const currentValue = hourlyForecasts.get(timeKey) || 0;
      hourlyForecasts.set(timeKey, currentValue + forecast.pv_estimate);
    });
    
    // Convert map to array and sort by time
    const formattedForecasts: SolarForecast[] = Array.from(hourlyForecasts.entries())
      .map(([timestamp, power]) => ({
        timestamp,
        power, // This is in kW
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    // Fill in any missing hours with zero
    const fullDayForecasts: SolarForecast[] = [];
    for (let i = 0; i < 24; i++) {
      const timeKey = `${i.toString().padStart(2, '0')}:00`;
      const existingForecast = formattedForecasts.find(f => f.timestamp === timeKey);
      
      if (existingForecast) {
        fullDayForecasts.push(existingForecast);
      } else {
        fullDayForecasts.push({
          timestamp: timeKey,
          power: 0,
        });
      }
    }
    
    return fullDayForecasts;
  } catch (error) {
    console.error("Error fetching solar forecast:", error);
    // If API call fails, return empty array
    return [];
  }
};

// Checks if an API key is valid (simplified)
export const validateApiKey = async (
  apiKey: string,
  resourceId: string
): Promise<boolean> => {
  try {
    const url = `https://api.solcast.com.au/rooftop_sites/${resourceId}/forecasts?format=json&api_key=${apiKey}`;
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
};
