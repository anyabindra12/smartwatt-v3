
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Device } from "@/mock/data";
import { calculateDailySavings, formatCurrency } from "@/utils/optimizationHelpers";
import { ArrowUpRight, Coins, PiggyBank, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SavingsCardProps {
  devices: Device[];
  optimizedDevices: number;
}

const SavingsCard = ({ devices, optimizedDevices }: SavingsCardProps) => {
  const dailySavings = calculateDailySavings(devices);
  const monthlySavings = dailySavings * 30;
  const yearlySavings = dailySavings * 365;
  
  const optimizationPercentage = devices.length > 0
    ? Math.round((optimizedDevices / devices.length) * 100)
    : 0;

  return (
    <Card className="energy-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-eco" />
          Energy Savings
        </CardTitle>
        <CardDescription>
          Your estimated savings from optimized schedules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-muted/40 rounded-md">
            <div className="text-sm text-muted-foreground">Daily</div>
            <div className="text-xl font-bold">{formatCurrency(dailySavings)}</div>
          </div>
          <div className="p-2 bg-muted/40 rounded-md">
            <div className="text-sm text-muted-foreground">Monthly</div>
            <div className="text-xl font-bold">{formatCurrency(monthlySavings)}</div>
          </div>
          <div className="p-2 bg-muted/40 rounded-md">
            <div className="text-sm text-muted-foreground">Yearly</div>
            <div className="text-xl font-bold">{formatCurrency(yearlySavings)}</div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-solar" />
              Optimization Efficiency
            </span>
            <span className="font-medium">{optimizationPercentage}%</span>
          </div>
          <Progress value={optimizationPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {optimizedDevices} out of {devices.length} devices optimized
          </p>
        </div>
        
        <div className="pt-2">
          <div className="border rounded-md p-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-eco" />
                Potential Savings
              </div>
              <p className="text-xs text-muted-foreground">
                Optimize all devices to save up to {formatCurrency(yearlySavings * 1.5)} yearly
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SavingsCard;
