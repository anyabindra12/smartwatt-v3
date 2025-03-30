
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { devices, electricityPrices } from "@/mock/data";
import { formatCurrency } from "@/utils/optimizationHelpers";
import { PiggyBank, TrendingDown, TrendingUp, Zap, ListFilter, BarChart as BarChartIcon, PieChart as PieChartIcon } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Bar, BarChart, PieChart, Pie, Cell, Sector } from "recharts";

// Define the Device interface properly
interface Device {
  id: string;
  name: string;
  type: string;
  powerConsumption: number;
  schedulable: boolean;
}

// Add the DeviceWithUsage interface
interface DeviceWithUsage extends Device {
  usage?: {
    [key: string]: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface CostAnalysisProps {
  defaultTab?: "usage" | "breakdown";
}

const CostAnalysis = ({ defaultTab = "breakdown" }: CostAnalysisProps) => {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [activeTab, setActiveTab] = useState<"usage" | "breakdown">(defaultTab);
  
  // Generate cost data for the selected period
  const generateCostData = () => {
    if (period === "day") {
      // Hourly data for a day
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const time = `${hour.toString().padStart(2, '0')}:00`;
        
        // Get actual price from data if available
        const priceData = electricityPrices.find(p => p.timestamp === time) || { timestamp: time, price: 0.15 };
        
        // Generate usage based on hour (simulation)
        const usage = hour >= 17 && hour <= 22 ? 2.2 : 
                     hour >= 7 && hour <= 9 ? 1.8 :
                     hour >= 0 && hour <= 5 ? 0.5 : 1.2;
          
        return {
          time,
          usage,
          price: priceData.price,
          cost: usage * priceData.price
        };
      });
    } else {
      // Daily data for week/month
      const days = period === "week" ? 7 : 30;
      return Array.from({ length: days }, (_, i) => {
        const dayNum = i + 1;
        const day = period === "week" 
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] 
          : `Day ${dayNum}`;
        
        // Slightly randomized but with a pattern
        const baseUsage = 18 + (Math.sin(i * 0.5) * 6);
        const usage = baseUsage + (Math.random() * 5);
        const avgPrice = 0.15 + (Math.random() * 0.05);
        const cost = usage * avgPrice;
        
        return {
          day,
          usage: parseFloat(usage.toFixed(1)),
          avgPrice: parseFloat(avgPrice.toFixed(3)),
          cost: parseFloat(cost.toFixed(2))
        };
      });
    }
  };
  
  const costData = generateCostData();
  
  // Calculate total cost
  const totalCost = costData.reduce((sum, item) => sum + item.cost, 0);
  
  // Calculate device-specific costs
  const deviceCosts = devices.map((device: Device) => {
    // Calculate cost based on power consumption and usage pattern
    // This is a simplification; in a real app we'd use actual usage data
    const powerConsumptionKWh = device.powerConsumption / 1000;
    const hoursPerDay = device.type === 'heating' ? 6 : 
                       device.type === 'appliance' ? 2 :
                       device.type === 'mobility' ? 3 : 1;
                       
    // For monthly view, calculate monthly cost
    const totalHours = period === "day" ? 1 : period === "week" ? 7 : 30;
    const usage = powerConsumptionKWh * hoursPerDay * totalHours;
    const avgPrice = 0.15; // Average price per kWh
    const cost = usage * avgPrice;
    
    const dailyCost = powerConsumptionKWh * hoursPerDay * avgPrice;
    const weeklyCost = dailyCost * 7;
    
    return {
      id: device.id,
      name: device.name,
      cost,
      powerConsumption: device.powerConsumption,
      dailyUsageHours: hoursPerDay,
      dailyCost,
      weeklyCost
    };
  }).sort((a, b) => b.cost - a.cost);

  // Prepare data for pie chart
  const pieChartData = deviceCosts.map(device => ({
    name: device.name,
    value: device.cost
  }));

  // Generate hourly cost distribution data
  const generateCostDistributionData = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // Get actual price from data if available
      const priceData = electricityPrices.find(p => p.timestamp === time) || { timestamp: time, price: 0.15 };
      
      // Generate usage based on hour (simulation)
      let costPercentage = 0;
      
      // Morning peak
      if (hour >= 7 && hour <= 9) {
        costPercentage = 6 + (Math.random() * 2);
      }
      // Evening peak 
      else if (hour >= 17 && hour <= 22) {
        costPercentage = 10 + (Math.random() * 3);
      }
      // Night/early morning (low usage)
      else if (hour >= 0 && hour <= 5) {
        costPercentage = 1 + (Math.random() * 1);
      }
      // Midday
      else {
        costPercentage = 3 + (Math.random() * 2);
      }
      
      return {
        time,
        costPercentage: parseFloat(costPercentage.toFixed(1))
      };
    });
  };

  const costDistributionData = generateCostDistributionData();

  // Generate cost distribution by device type
  const generateCostByTypeData = () => {
    const typeMap: Record<string, number> = {};
    
    deviceCosts.forEach(device => {
      const deviceFromMock = devices.find(d => d.id === device.id);
      if (deviceFromMock) {
        if (!typeMap[deviceFromMock.type]) {
          typeMap[deviceFromMock.type] = 0;
        }
        typeMap[deviceFromMock.type] += device.cost;
      }
    });
    
    return Object.entries(typeMap).map(([type, cost]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize
      value: cost
    }));
  };
  
  const costByTypeData = generateCostByTypeData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Cost Analysis
              </CardTitle>
              <CardDescription>
                Analyze your energy costs over different periods
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Tabs value={activeTab} onValueChange={(value: "usage" | "breakdown") => setActiveTab(value)}>
                <TabsList>
                  <TabsTrigger value="usage" className="flex items-center gap-1">
                    <BarChartIcon className="h-4 w-4" />
                    Usage
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="flex items-center gap-1">
                    <PieChartIcon className="h-4 w-4" />
                    Breakdown
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Tabs value={period} onValueChange={(value: "day" | "week" | "month") => setPeriod(value)}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              Total Cost: {formatCurrency(totalCost)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "usage" && (
            <div className="mt-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {period === "day" ? (
                    <LineChart data={costData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${value.toFixed(2)}`} />
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, "Cost"]} />
                      <Legend />
                      <Line type="monotone" dataKey="cost" name="Cost (€)" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="usage" name="Usage (kWh)" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="price" name="Price (€/kWh)" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  ) : (
                    <BarChart data={costData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${value.toFixed(2)}`} />
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, "Cost"]} />
                      <Legend />
                      <Bar dataKey="cost" name="Cost" fill="#8884d8" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Device Cost Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceCosts.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.name}</TableCell>
                        <TableCell>{formatCurrency(device.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {activeTab === "breakdown" && (
            <div className="mt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2 text-primary" />
                    Cost Breakdown by Device
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    See which devices are consuming the most energy
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieChartData} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          fill="#8884d8" 
                          dataKey="value" 
                          nameKey="name"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <BarChartIcon className="h-5 w-5 mr-2 text-primary" />
                    Cost Distribution by Time
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Energy costs throughout the day
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Cost Percentage']} />
                        <Bar dataKey="costPercentage" name="Cost Percentage" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2 text-primary" />
                    Cost Breakdown by Device Type
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cost distribution across different device categories
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={costByTypeData} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          fill="#8884d8" 
                          dataKey="value" 
                          nameKey="name"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {costByTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <BarChartIcon className="h-5 w-5 mr-2 text-primary" />
                    Top 5 Expensive Devices
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Devices with the highest energy costs
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={deviceCosts.slice(0, 5)} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `€${value.toFixed(2)}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
                        <Bar dataKey="cost" name="Monthly Cost" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Detailed Cost Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cost breakdown for each device
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Power Consumption</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Daily Cost</TableHead>
                        <TableHead>Weekly Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceCosts.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell>{device.name}</TableCell>
                          <TableCell>{device.powerConsumption} W</TableCell>
                          <TableCell>{device.dailyUsageHours} hours/day</TableCell>
                          <TableCell>{formatCurrency(device.dailyCost)}</TableCell>
                          <TableCell>{formatCurrency(device.weeklyCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>A detailed breakdown of energy costs by device.</TableCaption>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostAnalysis;
