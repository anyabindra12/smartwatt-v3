
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { devices as initialDevices, electricityPrices } from "@/mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { optimizeDeviceSchedule, OptimizationResult, UserConstraint, getCurrentSolarForecast, hasRealSolarData } from "@/utils/optimizationHelpers";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, Clock, Database, Zap } from "lucide-react";
import UpdateScheduleDialog from "@/components/UpdateScheduleDialog";
import { Schedule as ScheduleType, Device } from "@/mock/data";
import OptimizationResultChart from "@/components/OptimizationResultChart";

const Schedule = () => {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState(2);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [scheduleResults, setScheduleResults] = useState<OptimizationResult[]>([]);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleType | null>(null);
  const [currentOptimization, setCurrentOptimization] = useState<OptimizationResult | null>(null);
  const [showOptimizationChart, setShowOptimizationChart] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const schedulableDevices = devices.filter(device => device.schedulable);

  // Handle updating a schedule
  const handleScheduleUpdate = (updatedSchedule: ScheduleType) => {
    setDevices(prev => prev.map(device => {
      if (device.id === updatedSchedule.deviceId) {
        const updatedSchedules = device.schedules 
          ? device.schedules.map(schedule => 
              schedule.id === updatedSchedule.id ? updatedSchedule : schedule
            )
          : [updatedSchedule];
          
        return {
          ...device,
          schedules: updatedSchedules
        };
      }
      return device;
    }));
  };

  const handleOptimize = async () => {
    if (!selectedDevice) {
      toast({
        title: "No device selected",
        description: "Please select a device to create a schedule",
        variant: "destructive",
      });
      return;
    }

    const device = devices.find(d => d.id === selectedDevice);
    if (!device) return;

    setIsOptimizing(true);

    try {
      const constraints: UserConstraint = {
        startTimeRange: startTime,
        endTimeRange: endTime,
        priority: priority,
      };

      // Wait for the optimization result
      const result = await optimizeDeviceSchedule(device, duration, constraints);
      
      // Add the new result to the list
      setScheduleResults(prev => [result, ...prev.slice(0, 4)]);
      
      // Save the current optimization result to display the chart
      setCurrentOptimization(result);
      setShowOptimizationChart(true);

      // Save the optimization to the device's schedule
      setDevices(prev => prev.map(d => {
        if (d.id === selectedDevice) {
          return {
            ...d,
            schedules: [
              {
                id: `s-${Date.now()}`,
                deviceId: d.id,
                startTime: result.recommendedStartTime,
                endTime: result.recommendedEndTime,
                isOptimized: true,
                savings: result.estimatedSavings,
              }
            ]
          };
        }
        return d;
      }));

      toast({
        title: "Schedule optimized",
        description: `${device.name} scheduled to run at ${result.recommendedStartTime}`,
      });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({
        title: "Optimization failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const openUpdateDialog = (schedule: ScheduleType) => {
    setCurrentSchedule(schedule);
    setShowUpdateDialog(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Device Scheduling</h2>
            <p className="text-muted-foreground">
              Schedule your devices to run at optimal times based on energy prices and solar production
            </p>
            {hasRealSolarData() && (
              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Using real solar forecast data
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Create New Schedule
                  </CardTitle>
                  <CardDescription>
                    Set your preferences and let the optimization algorithm recommend the best time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="device">Device</Label>
                        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                          <SelectTrigger id="device">
                            <SelectValue placeholder="Select device" />
                          </SelectTrigger>
                          <SelectContent>
                            {schedulableDevices.map(device => (
                              <SelectItem key={device.id} value={device.id}>
                                {device.name} ({device.powerConsumption}W)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (hours)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          max="24"
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Time Window Constraint</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startTime" className="text-xs text-muted-foreground">Start Time</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="startTime"
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="endTime" className="text-xs text-muted-foreground">End Time</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="endTime"
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
                        <SelectTrigger id="priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - Prioritize energy savings</SelectItem>
                          <SelectItem value="medium">Medium - Balance time and savings</SelectItem>
                          <SelectItem value="high">High - Strictly follow time window</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleOptimize} 
                      className="w-full mt-4"
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <>
                          <span className="animate-spin mr-2">⌛</span>
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Optimize Schedule
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Show optimization chart when result is available */}
              {showOptimizationChart && currentOptimization && (
                <OptimizationResultChart optimizationResult={currentOptimization} />
              )}
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Optimizations</CardTitle>
                  <CardDescription>
                    Latest optimal time slots and savings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scheduleResults.length > 0 ? (
                    <div className="space-y-4">
                      {scheduleResults.map((result, index) => {
                        const device = devices.find(d => d.id === result.deviceId);
                        return (
                          <div key={index} className="border rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{device?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {result.recommendedStartTime} - {result.recommendedEndTime}
                                </p>
                              </div>
                              <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs py-1 px-2 rounded-full">
                                {result.estimatedSavings.toFixed(2)} $ savings
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Confidence: {result.confidence}%</span>
                              {hasRealSolarData() && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                  Real Data
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No optimizations yet</p>
                      <p className="text-sm">Create a schedule to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Devices</CardTitle>
                <CardDescription>
                  Devices with optimized running schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="optimized">
                  <TabsList className="mb-4">
                    <TabsTrigger value="optimized">Optimized</TabsTrigger>
                    <TabsTrigger value="all">All Devices</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="optimized">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {devices
                        .filter(device => device.schedulable && device.schedules && device.schedules.length > 0)
                        .map(device => (
                          <Card key={device.id} className="overflow-hidden border-2">
                            <CardHeader className="p-4 pb-2 bg-muted/50">
                              <CardTitle className="text-base flex justify-between">
                                <span>{device.name}</span>
                                <span className="text-sm font-normal">{device.powerConsumption}W</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                              {device.schedules?.map(schedule => (
                                <div key={schedule.id} className="text-sm space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Run time:</span>
                                    <span>{schedule.startTime} - {schedule.endTime}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Savings:</span>
                                    <span className="text-green-600">
                                      {schedule.savings ? schedule.savings.toFixed(2) : "0.00"} $
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full"
                                      onClick={() => openUpdateDialog(schedule)}
                                    >
                                      Update Schedule
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      {devices.filter(device => device.schedulable && device.schedules && device.schedules.length > 0).length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <p>No optimized devices yet</p>
                          <p className="text-sm">Optimize a device schedule to see it here</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="all">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {devices.map(device => (
                        <Card key={device.id} className={`overflow-hidden ${device.schedulable ? '' : 'opacity-70'}`}>
                          <CardHeader className="p-4 pb-2 bg-muted/50">
                            <CardTitle className="text-base flex justify-between">
                              <span>{device.name}</span>
                              <span className="text-sm font-normal">{device.powerConsumption}W</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            {device.schedulable ? (
                              device.schedules && device.schedules.length > 0 ? (
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Run time:</span>
                                    <span>{device.schedules[0].startTime} - {device.schedules[0].endTime}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Savings:</span>
                                    <span className="text-green-600">
                                      {device.schedules[0]?.savings ? device.schedules[0].savings.toFixed(2) : "0.00"} $
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full"
                                      onClick={() => openUpdateDialog(device.schedules![0])}
                                    >
                                      Update Schedule
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No schedule set</p>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground">Not schedulable</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <UpdateScheduleDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        schedule={currentSchedule}
        onSave={handleScheduleUpdate}
      />
    </div>
  );
};

export default Schedule;