
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Schedule } from "@/mock/data";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpdateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
  onSave: (schedule: Schedule) => void;
}

const UpdateScheduleDialog = ({ open, onOpenChange, schedule, onSave }: UpdateScheduleDialogProps) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { toast } = useToast();

  // Reset form when the dialog opens or when schedule changes
  useEffect(() => {
    if (schedule) {
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
    }
  }, [schedule, open]);

  const handleSave = () => {
    if (!schedule) return;
    
    // Validate times
    if (!startTime || !endTime) {
      toast({
        title: "Invalid times",
        description: "Please provide both start and end times",
        variant: "destructive",
      });
      return;
    }

    // Create updated schedule
    const updatedSchedule = {
      ...schedule,
      startTime,
      endTime,
      isOptimized: false, // Mark as manually overridden
    };

    onSave(updatedSchedule);
    onOpenChange(false);
    
    toast({
      title: "Schedule updated",
      description: "Your device schedule has been manually updated",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Schedule</DialogTitle>
          <DialogDescription>
            Manually override the optimized schedule for your device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
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
            <Label htmlFor="endTime">End Time</Label>
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
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateScheduleDialog;
