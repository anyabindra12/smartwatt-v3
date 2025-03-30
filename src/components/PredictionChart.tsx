
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PriceData, SolarForecast } from "@/mock/data";
import { formatCurrency, hasRealSolarData } from "@/utils/optimizationHelpers";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CloudSun } from "lucide-react";

interface PredictionChartProps {
  solarData: SolarForecast[];
  priceData: PriceData[];
  title?: string;
  description?: string;
  useRealData?: boolean;
}

const PredictionChart = ({ 
  solarData, 
  priceData, 
  title = "Energy Forecast", 
  description = "Predicted solar generation and electricity prices",
  useRealData = false
}: PredictionChartProps) => {
  // Combine the data for the dual-axis chart
  const combinedData = solarData.map(solar => {
    const price = priceData.find(p => p.timestamp === solar.timestamp);
    return {
      timestamp: solar.timestamp,
      solarPower: solar.power,
      price: price ? price.price : 0
    };
  });

  // Check if we're using real data from Solcast API
  const isRealData = useRealData || hasRealSolarData();

  return (
    <Card className="energy-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {isRealData && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 flex items-center">
              <CloudSun className="h-3 w-3 mr-1" />
              Solcast Data
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={combinedData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }} 
                tickMargin={10} 
                className="text-xs"
              />
              <YAxis 
                yAxisId="left"
                orientation="left" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
                className="text-xs"
                domain={[0, 'auto']}
                unit="kW"
              />
              <YAxis 
                yAxisId="right"
                orientation="right" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
                className="text-xs"
                domain={[0, 'auto']}
                unit="€/kWh"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: 'none'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'price') return [formatCurrency(value).replace('€', '') + ' €/kWh', 'Price'];
                  return [`${value.toFixed(2)} kW`, 'Solar Power'];
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="solarPower"
                name="Solar Power"
                stroke="#F6B93B"
                fill="#F6B93B"
                fillOpacity={0.6}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                name="price"
                stroke="#E74C3C"
                dot={false}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionChart;
