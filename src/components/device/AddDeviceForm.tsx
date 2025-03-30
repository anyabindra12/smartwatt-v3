
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { Device } from "@/mock/data";
import { Plus } from "lucide-react";

const deviceTypes = ["appliance", "heating", "mobility", "lighting", "hvac"];

const deviceSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.string().refine(value => deviceTypes.includes(value), {
    message: "Please select a valid device type."
  }),
  powerConsumption: z.coerce.number().positive({ message: "Power consumption must be a positive number." }),
  schedulable: z.boolean().default(false),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface AddDeviceFormProps {
  onAddDevice: (device: Omit<Device, "id" | "isRunning" | "icon">) => void;
  onCancel: () => void;
}

const AddDeviceForm: React.FC<AddDeviceFormProps> = ({ onAddDevice, onCancel }) => {
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      type: "appliance",
      powerConsumption: 100,
      schedulable: false,
    },
  });

  const onSubmit = (data: DeviceFormValues) => {
    try {
      onAddDevice({
        name: data.name,
        type: data.type,
        powerConsumption: data.powerConsumption,
        schedulable: data.schedulable,
      });
      
      toast({
        title: "Device added",
        description: `${data.name} has been added to your devices.`,
      });
      
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add device. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter device name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {deviceTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      <span className="capitalize">{type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="powerConsumption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Power Consumption (Watts)</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schedulable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Schedulable</FormLabel>
                <FormDescription>
                  This device can be scheduled for optimal usage.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddDeviceForm;