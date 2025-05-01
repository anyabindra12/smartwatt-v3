
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { devices, electricityPrices, solarForecast } from "@/mock/data";
import { formatCurrency } from "@/utils/optimizationHelpers";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, Bar, BarChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, LineChart as LineChartIcon, PieChart, Sparkles, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define the Device interface properly
interface Device {
  id: string;
  name: string;
  type: string;
  powerConsumption: number;
  schedulable: boolean;
}

interface DeviceWithUsage extends Device {
  usage?: {
    [key: string]: number;
  };
  schedules?: Array<{
    id: string;
    isOptimized: boolean;
    savings: number;
  }>;
}

type TimeSlotRating = "Excellent" | "Good" | "Fair" | "Poor" | "Avoid";

interface TimeSlot {
  time: string;
  solarPower: number;
  price: number;
  rating: TimeSlotRating;
}

interface DeviceOptimization {
  id: string;
  name: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  optimized?: boolean;
  optimizationPercentage?: number;
}

const OptimizationReport = () => {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  
  const generateTimeSeriesData = () => {
    if (period === "day") {
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const time = `${hour.toString().padStart(2, '0')}:00`;
        
        const priceData = electricityPrices.find(p => p.timestamp === time) || { timestamp: time, price: 0.15 };
        
        const solarProduction = hour >= 6 && hour <= 18
          ? Math.sin(((hour - 6) / 12) * Math.PI) * 2.5
          : 0;
          
        return {
          time,
          price: priceData.price,
          solarProduction,
          optimizedUsage: hour >= 10 && hour <= 14 ? 1.2 : hour >= 0 && hour <= 6 ? 0.8 : 0.5,
          originalUsage: hour >= 17 && hour <= 22 ? 1.8 : 0.7,
        };
      });
    } else {
      const days = period === "week" ? 7 : 30;
      return Array.from({ length: days }, (_, i) => {
        const day = period === "week" 
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] 
          : `Day ${i+1}`;
        
        return {
          day,
          optimizedCost: 2.5 + Math.random() * 1,
          originalCost: 4 + Math.random() * 1.5,
          savings: 1.5 + Math.random(),
        };
      });
    }
  };
  
  const timeSeriesData = generateTimeSeriesData();
  
  const calculateSavings = () => {
    if (period === "day") {
      let originalCost = 0;
      let optimizedCost = 0;
      
      timeSeriesData.forEach(data => {
        originalCost += data.originalUsage * data.price;
        optimizedCost += data.optimizedUsage * data.price;
      });
      
      return {
        originalCost,
        optimizedCost,
        savings: originalCost - optimizedCost,
        percentage: ((originalCost - optimizedCost) / originalCost) * 100
      };
    } else {
      let totalOriginal = 0;
      let totalOptimized = 0;
      let totalSavings = 0;
      
      timeSeriesData.forEach(data => {
        totalOriginal += data.originalCost;
        totalOptimized += data.optimizedCost;
        totalSavings += data.savings;
      });
      
      return {
        originalCost: totalOriginal,
        optimizedCost: totalOptimized,
        savings: totalSavings,
        percentage: (totalSavings / totalOriginal) * 100
      };
    }
  };
  
  const savingsData = calculateSavings();
  
  const generateTimeSlots = (): { best: TimeSlot[], worst: TimeSlot[] } => {
    // Predefined best and worst time slots as requested by the user
    const best: TimeSlot[] = [
      { time: "13:00", solarPower: 5.00, price: 0.10, rating: "Excellent" },
      { time: "12:00", solarPower: 5.10, price: 0.11, rating: "Excellent" },
      { time: "14:00", solarPower: 4.60, price: 0.09, rating: "Excellent" },
      { time: "11:00", solarPower: 4.70, price: 0.12, rating: "Excellent" },
      { time: "15:00", solarPower: 3.80, price: 0.10, rating: "Excellent" }
    ];
    
    const worst: TimeSlot[] = [
      { time: "20:00", solarPower: 0.00, price: 0.20, rating: "Avoid" },
      { time: "19:00", solarPower: 0.30, price: 0.21, rating: "Avoid" },
      { time: "21:00", solarPower: 0.00, price: 0.17, rating: "Avoid" },
      { time: "18:00", solarPower: 0.90, price: 0.18, rating: "Avoid" },
      { time: "22:00", solarPower: 0.00, price: 0.14, rating: "Avoid" }
    ];
    
    return { best, worst };
  };
  
  const { best, worst } = generateTimeSlots();
  
  const calculateDeviceOptimizations = (): DeviceOptimization[] => {
    // Predefined device optimizations as requested by the user
    return [
      {
        id: "ev-charger",
        name: "EV Charger",
        currentCost: 120.96,
        optimizedCost: 82.08,
        savings: 38.88,
        savingsPercentage: 32,
        optimized: true,
        optimizationPercentage: 32
      },
      {
        id: "water-heater",
        name: "Water Heater",
        currentCost: 33.60,
        optimizedCost: 22.80,
        savings: 10.80,
        savingsPercentage: 32,
        optimized: true,
        optimizationPercentage: 32
      },
      {
        id: "living-room-ac",
        name: "Living Room AC",
        currentCost: 30.24,
        optimizedCost: 20.52,
        savings: 9.72,
        savingsPercentage: 32,
        optimized: true,
        optimizationPercentage: 32
      },
      {
        id: "dishwasher",
        name: "Dishwasher",
        currentCost: 20.16,
        optimizedCost: 13.68,
        savings: 6.48,
        savingsPercentage: 32,
        optimized: true,
        optimizationPercentage: 32
      },
      {
        id: "washing-machine",
        name: "Washing Machine",
        currentCost: 15.12,
        optimizedCost: 10.26,
        savings: 4.86,
        savingsPercentage: 32,
        optimized: true,
        optimizationPercentage: 32
      }
    ];
  };
  
  const deviceOptimizations = calculateDeviceOptimizations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Optimization Results
              </CardTitle>
              <CardDescription>
                Compare your optimized energy usage with original patterns
              </CardDescription>
            </div>
            <Tabs defaultValue={period} onValueChange={(value: "day" | "week" | "month") => setPeriod(value)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              Savings: {formatCurrency(savingsData.savings)} ({savingsData.percentage.toFixed(1)}%)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {period === "day" ? (
                <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="originalUsage" 
                    name="Original Usage (kWh)" 
                    stroke="#ff8c00" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="optimizedUsage" 
                    name="Optimized Usage (kWh)" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="price" 
                    name="Electricity Price ($/kWh)" 
                    stroke="#82ca9d" 
                    strokeDasharray="3 3"
                  />
                </LineChart>
              ) : (
                <BarChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
                  />
                  <Legend />
                  <Bar dataKey="originalCost" name="Original Cost" fill="#ff8c00" />
                  <Bar dataKey="optimizedCost" name="Optimized Cost" fill="#8884d8" />
                  <Bar dataKey="savings" name="Savings" fill="#82ca9d" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Device Optimization Summary</h3>
            <div className="space-y-4">
              {deviceOptimizations.map((device) => (
                <div key={device.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{device.name}</h4>
                    {device.optimized ? (
                      <Badge className="bg-green-50 text-green-700 hover:bg-green-100">Optimized</Badge>
                    ) : (
                      <Badge variant="outline">Not Optimized</Badge>
                    )}
                  </div>
                  
                  {device.optimized && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly Savings</p>
                          <p className="font-medium text-green-600">{formatCurrency(device.savings)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Efficiency Improved</p>
                          <p className="font-medium">{device.optimizationPercentage}%</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between mb-1 text-xs">
                          <span>Original</span>
                          <span>Optimized</span>
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-2.5 relative">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full" 
                            style={{ width: `${device.optimizationPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {!device.optimized && (
                    <p className="text-sm text-muted-foreground mt-2">
                      This device has not been optimized yet. Schedule it for potential savings.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Optimization Potential
          </CardTitle>
          <CardDescription>
            Identify the best times to run your devices and potential savings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium flex items-center mb-3">
                <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                Best Times to Run Devices
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Optimal time slots for device operation
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Solar Power</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {best.map((slot) => (
                    <TableRow key={slot.time}>
                      <TableCell>{slot.time}</TableCell>
                      <TableCell>{slot.solarPower.toFixed(2)} kW</TableCell>
                      <TableCell>{formatCurrency(slot.price)}/kWh</TableCell>
                      <TableCell>
                        <Badge className="bg-green-50 text-green-700">
                          {slot.rating}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div>
              <h3 className="text-lg font-medium flex items-center mb-3">
                <ThumbsDown className="h-5 w-5 text-red-500 mr-2" />
                Worst Times to Run Devices
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Time slots to avoid for high-consumption devices
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Solar Power</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worst.map((slot) => (
                    <TableRow key={slot.time}>
                      <TableCell>{slot.time}</TableCell>
                      <TableCell>{slot.solarPower.toFixed(2)} kW</TableCell>
                      <TableCell>{formatCurrency(slot.price)}/kWh</TableCell>
                      <TableCell>
                        <Badge className="bg-red-50 text-red-700">
                          {slot.rating}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center mb-3">
              <Zap className="h-5 w-5 text-amber-500 mr-2" />
              Device Optimization Potential
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Potential savings by running devices during optimal times
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Current Monthly Cost</TableHead>
                  <TableHead>Optimal Monthly Cost</TableHead>
                  <TableHead>Potential Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceOptimizations.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{formatCurrency(device.currentCost)}</TableCell>
                    <TableCell>{formatCurrency(device.optimizedCost)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-green-600">{device.savingsPercentage}%</span>
                        <span className="text-green-600">{formatCurrency(device.savings)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizationReport;
