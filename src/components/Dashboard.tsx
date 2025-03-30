
import { useState, useEffect } from "react";
import Header from "./Header";
import EnergyConsumptionChart from "./EnergyConsumptionChart";
import PredictionChart from "./PredictionChart";
import { devices as initialDevices, electricityPrices, energyConsumptionData, solarForecast as mockSolarForecast } from "@/mock/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeviceSchedule from "./DeviceSchedule";
import OptimizationPanel from "./OptimizationPanel";
import ApiSetup from "./ApiSetup";
import SavingsCard from "./SavingsCard";
import { fetchSolarForecast } from "@/utils/apiServices";
import { getCurrentSolarForecast, hasRealSolarData } from "@/utils/optimizationHelpers";

const Dashboard = () => {
  const [devices, setDevices] = useState(initialDevices);
  const [solarForecast, setSolarForecast] = useState(mockSolarForecast);
  
  // Load real solar forecast data if available
  useEffect(() => {
    // Update the solar forecast with the latest data
    setSolarForecast(getCurrentSolarForecast());
  }, []);
  
  const handleOptimizeDevice = (deviceId: string, startTime: string, endTime: string) => {
    setDevices(prev => prev.map(device => {
      if (device.id === deviceId) {
        return {
          ...device,
          schedules: [
            {
              id: `s-${Date.now()}`,
              deviceId,
              startTime,
              endTime,
              isOptimized: true,
              savings: 0.5 + Math.random() * 1, // Mock value
            }
          ]
        };
      }
      return device;
    }));
  };
  
  const optimizedDevicesCount = devices.filter(
    d => d.schedulable && d.schedules && d.schedules.some(s => s.isOptimized)
  ).length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
              <p className="text-muted-foreground mb-6">
                Monitor your energy consumption and optimize your device schedules
              </p>
            </div>
            <div>
              <SavingsCard 
                devices={devices}
                optimizedDevices={optimizedDevicesCount}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <EnergyConsumptionChart data={energyConsumptionData} />
            <PredictionChart 
              solarData={solarForecast} 
              priceData={electricityPrices} 
              useRealData={hasRealSolarData()}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <Tabs defaultValue="devices">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="devices">Device Schedules</TabsTrigger>
                  <TabsTrigger value="api">API Connections</TabsTrigger>
                </TabsList>
                
                <TabsContent value="devices">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {devices.map(device => (
                      <DeviceSchedule key={device.id} device={device} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="api">
                  <div className="grid grid-cols-1 gap-6">
                    <ApiSetup />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div>
              <OptimizationPanel 
                devices={devices}
                onOptimize={handleOptimizeDevice}
              />
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-4 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-2 md:mb-0">
              <div className="w-6 h-6 rounded-full smartwatt-gradient flex items-center justify-center">
                <span className="text-white font-bold text-xs">SW</span>
              </div>
              <span className="text-sm font-semibold">SmartWatt</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Intelligent Home Energy Management System
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
