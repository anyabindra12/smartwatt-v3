// ERIKA TO-DO: this should be live-time data
// need to access EnergyData[] from back-end
/*
export interface EnergyData {
  timestamp: string;
  value: number;
  type: string;
}
*/

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnergyData } from "@/mock/data";

interface EnergyConsumptionChartProps {
  data: EnergyData[];
  title?: string;
  description?: string;
}

const EnergyConsumptionChart = ({ 
  data, 
  title = "Energy Consumption", 
  description = "Today's energy consumption by source" 
}: EnergyConsumptionChartProps) => {
  // Prepare the data for the stacked area chart
  const formattedData = data.reduce((result: any[], curr) => {
    const existingTimeEntry = result.find(item => item.timestamp === curr.timestamp);
    
    if (existingTimeEntry) {
      existingTimeEntry[curr.type] = curr.value;
    } else {
      const newEntry = { timestamp: curr.timestamp };
      newEntry[curr.type] = curr.value;
      result.push(newEntry);
    }
    
    return result;
  }, []);

  return (
    <Card className="energy-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498DB" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3498DB" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F6B93B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F6B93B" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }} 
                tickMargin={10}
                className="text-xs" 
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickMargin={10}
                className="text-xs"
                unit="kW" 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: 'none'
                }}
                formatter={(value: number) => [`${value.toFixed(2)} kW`, '']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="grid" 
                name="Grid Power" 
                stackId="1"
                stroke="#3498DB" 
                fillOpacity={1} 
                fill="url(#colorGrid)" 
              />
              <Area 
                type="monotone" 
                dataKey="solar" 
                name="Solar Power" 
                stackId="1" 
                stroke="#F6B93B" 
                fillOpacity={1} 
                fill="url(#colorSolar)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyConsumptionChart;
