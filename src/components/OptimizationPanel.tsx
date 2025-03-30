import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Device } from "@/mock/data";
import { calculateDailySavings, formatCurrency, optimizeDeviceSchedule } from "@/utils/optimizationHelpers";
import { useState } from "react";
import { ArrowRight, Calendar, Clock, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OptimizationPanelProps {
  devices: Device[];
  onOptimize?: (deviceId: string, startTime: string, endTime: string) => void;
}

interface UserConstraint {
  startTimeRange: string;
  endTimeRange: string;
  priority: 'low' | 'medium' | 'high';
}

const OptimizationPanel = ({ devices, onOptimize }: OptimizationPanelProps) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [duration, setDuration] = useState(2);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showConstraints, setShowConstraints] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [userConstraint, setUserConstraint] = useState<UserConstraint>({
    startTimeRange: '08:00',
    endTimeRange: '20:00',
    priority: 'medium'
  });
  
  const schedulableDevices = devices.filter(d => d.schedulable);
  
  const handleOptimize = async () => {
    if (!selectedDevice) {
      toast({
        title: "Error",
        description: "Please select a device first",
        variant: "destructive"
      });
      return;
    }
    
    setIsOptimizing(true);
    
    try {
      const result = await optimizeDeviceSchedule(
        selectedDevice, 
        duration,
        showConstraints ? userConstraint : undefined
      );
      
      setOptimizationResult(result);
      
      toast({
        title: "Optimization completed",
        description: `Best time to run ${selectedDevice.name}: ${result.recommendedStartTime} - ${result.recommendedEndTime}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({
        title: "Optimization failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplySchedule = () => {
    if (!optimizationResult || !selectedDevice) return;
    
    onOptimize?.(
      selectedDevice.id, 
      optimizationResult.recommendedStartTime, 
      optimizationResult.recommendedEndTime
    );
    
    toast({
      title: "Schedule applied",
      description: `${selectedDevice.name} has been scheduled for ${optimizationResult.recommendedStartTime} - ${optimizationResult.recommendedEndTime}`,
      variant: "default"
    });
    
    setSelectedDevice(null);
    setOptimizationResult(null);
  };

  const handleToggleConstraints = () => {
    setShowConstraints(!showConstraints);
  };

  const updateConstraint = (field: keyof UserConstraint, value: any) => {
    setUserConstraint(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="energy-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-solar" />
          Smart Optimization
        </CardTitle>
        <CardDescription>
          Optimize your device schedules to save energy and money
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="optimize" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="optimize">Optimize Device</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Device</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const device = devices.find(d => d.id === e.target.value);
                    setSelectedDevice(device || null);
                  }}
                >
                  <option value="">Select a device</option>
                  {schedulableDevices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.powerConsumption}W)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Running Duration (hours)</label>
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 hour</span>
                  <span>{duration} hours</span>
                  <span>8 hours</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  onClick={handleToggleConstraints}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {showConstraints ? "Hide Constraints" : "Add Constraints"}
                </Button>
                {showConstraints && (
                  <span className="text-xs text-muted-foreground">Define when you want to run the device</span>
                )}
              </div>
              
              {showConstraints && (
                <div className="space-y-3 p-3 border rounded-md bg-muted/20">
                  <h4 className="text-sm font-medium">Custom Constraints</h4>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs mb-1 block flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Earliest Start Time
                        </label>
                        <Input
                          type="time"
                          value={userConstraint.startTimeRange}
                          onChange={(e) => updateConstraint('startTimeRange', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Latest End Time
                        </label>
                        <Input
                          type="time"
                          value={userConstraint.endTimeRange}
                          onChange={(e) => updateConstraint('endTimeRange', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs mb-1 block">Priority</label>
                      <Select 
                        value={userConstraint.priority}
                        onValueChange={(value) => updateConstraint('priority', value as 'low' | 'medium' | 'high')}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Flexible timing)</SelectItem>
                          <SelectItem value="medium">Medium (Preferred timing)</SelectItem>
                          <SelectItem value="high">High (Must run in this window)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleOptimize} 
                className="w-full bg-eco hover:bg-eco-dark"
                disabled={!selectedDevice || isOptimizing}
              >
                {isOptimizing ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Optimizing...
                  </>
                ) : (
                  <>Find Optimal Time</>
                )}
              </Button>
              
              {optimizationResult && (
                <div className="mt-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-semibold mb-2">Optimization Result</h4>
                  <div className="space-y-1 text-sm">
                    <p>Best time to run: {optimizationResult.recommendedStartTime} - {optimizationResult.recommendedEndTime}</p>
                    <p>Estimated savings: {formatCurrency(optimizationResult.estimatedSavings)}</p>
                    <p>Confidence: {optimizationResult.confidence}%</p>
                    
                    <Button onClick={handleApplySchedule} className="mt-3 w-full">
                      Apply Schedule <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="savings">
            <div className="space-y-4">
              <div className="p-4 border rounded-md bg-muted/30">
                <h4 className="font-semibold mb-2">Current Savings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateDailySavings(devices))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateDailySavings(devices) * 30)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Device Savings</h4>
                <div className="space-y-2">
                  {schedulableDevices.map(device => {
                    const savings = device.schedules?.[0]?.savings || 0;
                    return (
                      <div key={device.id} className="flex justify-between items-center p-2 border-b">
                        <span>{device.name}</span>
                        <span className={savings > 0 ? "text-eco font-medium" : "text-muted-foreground"}>
                          {formatCurrency(savings)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OptimizationPanel;