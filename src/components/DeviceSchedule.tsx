import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Device, Schedule } from "@/mock/data";
import { Badge } from "@/components/ui/badge";
import { BarChart, Edit2, Power, Tag, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/optimizationHelpers";
import { useState, useEffect } from "react";
import UpdateScheduleDialog from "./UpdateScheduleDialog";
import { useToast } from "@/hooks/use-toast";
import OptimizationResultChart from "./OptimizationResultChart";

interface DeviceScheduleProps {
  device: Device;
  onUpdateSchedule?: (deviceId: string, schedule: Schedule) => void;
}

const DeviceSchedule = ({ device, onUpdateSchedule }: DeviceScheduleProps) => {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [showChart, setShowChart] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (device.schedules && device.schedules.length > 0) {
      setCurrentSchedule(device.schedules[0]);
    } else {
      setCurrentSchedule(null);
    }
  }, [device, device.schedules]);

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    setCurrentSchedule(updatedSchedule);
    
    if (onUpdateSchedule) {
      onUpdateSchedule(device.id, updatedSchedule);
    } else {
      toast({
        title: "Schedule updated",
        description: "Note: This is just a demo. The actual schedule update would happen here.",
      });
    }
  };

  const handleCreateSchedule = () => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      deviceId: device.id,
      startTime: "10:00",
      endTime: "12:00",
      isOptimized: false,
      savings: 0
    };
    
    setCurrentSchedule(newSchedule);
    setShowUpdateDialog(true);
  };

  const toggleChart = () => {
    setShowChart(!showChart);
  };

  const getOptimizationResult = () => {
    if (!currentSchedule) return null;
    
    return {
      deviceId: device.id,
      recommendedStartTime: currentSchedule.startTime,
      recommendedEndTime: currentSchedule.endTime,
      estimatedSavings: currentSchedule.savings,
      confidence: currentSchedule.isOptimized ? 85 : 60
    };
  };

  return (
    <>
      <Card className="energy-card">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {device.name}
                {device.isRunning && (
                  <Badge variant="default" className="bg-energy hover:bg-energy">
                    Running
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {device.powerConsumption} Watts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Power className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => currentSchedule && setShowUpdateDialog(true)}
                disabled={!currentSchedule}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              {currentSchedule && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleChart}
                >
                  <BarChart className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {device.schedulable ? (
            currentSchedule ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {currentSchedule.startTime} - {currentSchedule.endTime}
                  </span>
                  {currentSchedule.isOptimized && (
                    <Badge variant="outline" className="ml-auto bg-eco/10 text-eco border-eco hover:bg-eco/20">
                      Optimized
                    </Badge>
                  )}
                  {!currentSchedule.isOptimized && (
                    <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100">
                      Manual
                    </Badge>
                  )}
                </div>
                
                {currentSchedule.isOptimized && currentSchedule.savings > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>Savings: {formatCurrency(currentSchedule.savings)}</span>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button 
                    className="w-full bg-energy hover:bg-energy-dark"
                    onClick={() => setShowUpdateDialog(true)}
                  >
                    Update Schedule
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-muted-foreground mb-3">No schedule set</p>
                <Button 
                  className="bg-energy hover:bg-energy-dark"
                  onClick={handleCreateSchedule}
                >
                  Create Schedule
                </Button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center py-4">
              <p className="text-muted-foreground">Not schedulable</p>
            </div>
          )}
          
          {showChart && currentSchedule && (
            <div className="mt-4">
              <OptimizationResultChart optimizationResult={getOptimizationResult()} />
            </div>
          )}
        </CardContent>
      </Card>
      
      <UpdateScheduleDialog 
        open={showUpdateDialog} 
        onOpenChange={setShowUpdateDialog}
        schedule={currentSchedule}
        onSave={handleUpdateSchedule}
      />
    </>
  );
};

export default DeviceSchedule;