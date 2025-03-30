
import { useState } from "react";
import Header from "@/components/Header";
import { devices as initialDevices, energyConsumptionData } from "@/mock/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Battery, Bolt, Plus, Search, SunMedium, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from "@/utils/optimizationHelpers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddDeviceForm from "@/components/device/AddDeviceForm";
import { Device } from "@/mock/data";

const Devices = () => {
  const [devices, setDevices] = useState(initialDevices);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);

  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total consumption
  const totalConsumption = devices.reduce((sum, device) => sum + device.powerConsumption, 0);
  
  // Prepare data for the consumption chart
  const deviceChartData = devices.map(device => ({
    name: device.name,
    value: device.powerConsumption,
    percentage: (device.powerConsumption / totalConsumption) * 100,
    type: device.type
  }));

  // Generate colors based on device type
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'appliance': return '#4f46e5';
      case 'heating': return '#ef4444';
      case 'mobility': return '#3b82f6';
      case 'lighting': return '#eab308';
      case 'hvac': return '#10b981';
      default: return '#6b7280';
    }
  };

  const handleAddDevice = (newDevice: Omit<Device, "id" | "isRunning" | "icon">) => {
    // Create a device object with default values for missing properties
    const device: Device = {
      id: `device-${Date.now()}`,
      isRunning: false,
      icon: getDefaultIconForType(newDevice.type),
      ...newDevice,
    };

    setDevices(prev => [...prev, device]);
    setShowAddDeviceDialog(false);
  };

  const getDefaultIconForType = (type: string): string => {
    switch(type) {
      case 'appliance': return 'device';
      case 'heating': return 'flame';
      case 'mobility': return 'ev';
      case 'lighting': return 'lamp';
      case 'hvac': return 'aircon';
      default: return 'device';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Device Energy Consumption</h2>
            <p className="text-muted-foreground">
              Monitor and analyze energy usage across all your connected devices
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Power</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{totalConsumption.toLocaleString()} W</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Bolt className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{devices.filter(d => d.isRunning).length}</span>
                  <span className="text-sm text-muted-foreground">/ {devices.length}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Solar Contribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <SunMedium className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold">42%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Battery className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{formatCurrency(5.28)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Power Consumption Distribution</CardTitle>
                  <CardDescription>
                    Power usage by device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${value}W (${props.payload.percentage.toFixed(1)}%)`, 
                            'Consumption'
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {deviceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getTypeColor(entry.type)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Device Types</CardTitle>
                  <CardDescription>
                    Categories of connected devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['appliance', 'heating', 'mobility', 'lighting', 'hvac'].map(type => {
                      const typeDevices = devices.filter(d => d.type === type);
                      const typePower = typeDevices.reduce((sum, d) => sum + d.powerConsumption, 0);
                      const percentage = (typePower / totalConsumption) * 100;
                      
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getTypeColor(type) }}
                            />
                            <span className="capitalize">{type}</span>
                          </div>
                          <div className="text-sm text-right">
                            <div className="font-medium">{typePower.toLocaleString()} W</div>
                            <div className="text-muted-foreground">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Devices</CardTitle>
                <CardDescription>
                  Detailed information about connected devices
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search devices..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowAddDeviceDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="running">Running</TabsTrigger>
                  <TabsTrigger value="idle">Idle</TabsTrigger>
                  <TabsTrigger value="schedulable">Schedulable</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <DeviceTable devices={filteredDevices} />
                </TabsContent>
                
                <TabsContent value="running">
                  <DeviceTable devices={filteredDevices.filter(d => d.isRunning)} />
                </TabsContent>
                
                <TabsContent value="idle">
                  <DeviceTable devices={filteredDevices.filter(d => !d.isRunning)} />
                </TabsContent>
                
                <TabsContent value="schedulable">
                  <DeviceTable devices={filteredDevices.filter(d => d.schedulable)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
          </DialogHeader>
          <AddDeviceForm 
            onAddDevice={handleAddDevice} 
            onCancel={() => setShowAddDeviceDialog(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DeviceTableProps {
  devices: typeof initialDevices;
}

const DeviceTable = ({ devices }: DeviceTableProps) => {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Power</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Schedulable</TableHead>
            <TableHead>Schedule</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length > 0 ? (
            devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.name}</TableCell>
                <TableCell className="capitalize">{device.type}</TableCell>
                <TableCell>{device.powerConsumption}W</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    device.isRunning 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  }`}>
                    {device.isRunning ? 'Running' : 'Idle'}
                  </span>
                </TableCell>
                <TableCell>
                  {device.schedulable ? 
                    <span className="text-green-600">Yes</span> : 
                    <span className="text-slate-400">No</span>}
                </TableCell>
                <TableCell>
                  {device.schedulable && device.schedules && device.schedules.length > 0 ? (
                    <span>{device.schedules[0].startTime} - {device.schedules[0].endTime}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                No devices found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default Devices;