
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { OptimizationResult } from "@/utils/optimizationHelpers";
import { getCurrentSolarForecast } from "@/utils/optimizationHelpers";
import { electricityPrices } from "@/mock/data";

interface OptimizationResultChartProps {
  optimizationResult: OptimizationResult | null;
}

const OptimizationResultChart = ({ optimizationResult }: OptimizationResultChartProps) => {
  if (!optimizationResult) return null;

  // Parse times to get the hour ranges
  const startHour = parseInt(optimizationResult.recommendedStartTime.split(':')[0]);
  const endHour = parseInt(optimizationResult.recommendedEndTime.split(':')[0]);
  
  // Get the energy and price data for the chart
  const solarData = getCurrentSolarForecast();
  
  // Create chart data with original load, optimized load and prices
  const chartData = electricityPrices.map(priceData => {
    const hour = parseInt(priceData.timestamp.split(':')[0]);
    const solarPoint = solarData.find(s => s.timestamp === priceData.timestamp);
    
    // For optimized load, we'll show higher values during the optimal hours
    const isOptimalHour = hour >= startHour && hour <= endHour;
    
    // Create a point with both price and load data
    return {
      time: priceData.timestamp,
      price: priceData.price,
      originalLoad: solarPoint ? 1.5 + Math.random() * 0.5 : 0, // Simulate original load
      optimizedLoad: isOptimalHour ? 2.0 + Math.random() * 0.5 : 0.7 + Math.random() * 0.3, // Higher during optimal hours
      solarProduction: solarPoint ? solarPoint.power : 0
    };
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Schedule Optimization Results</CardTitle>
        <CardDescription>
          Comparing original and optimized load profiles with energy prices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }} 
                tickMargin={10}
              />
              <YAxis 
                yAxisId="left"
                orientation="left" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
                domain={[0, 'auto']}
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
                domain={[0, 'auto']}
                label={{ value: 'Price ($/kWh)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'price') return [`$${value.toFixed(2)}/kWh`, 'Price'];
                  if (name === 'originalLoad') return [`${value.toFixed(2)} kWh`, 'Original Load'];
                  if (name === 'optimizedLoad') return [`${value.toFixed(2)} kWh`, 'Optimized Load'];
                  if (name === 'solarProduction') return [`${value.toFixed(2)} kW`, 'Solar Production'];
                  return [value, name];
                }}
              />
              <Legend />
              
              {/* Highlight the recommended time window */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="optimizedLoad"
                name="Optimized Load"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="originalLoad"
                name="Original Load"
                stroke="#ff8c00"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                name="price"
                stroke="#e74c3c"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="solarProduction"
                name="Solar Production"
                stroke="#2ecc71"
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Recommended operation: {optimizationResult.recommendedStartTime} - {optimizationResult.recommendedEndTime}</p>
          <p>Estimated savings: ${optimizationResult.estimatedSavings.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizationResultChart;