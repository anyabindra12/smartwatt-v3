// This file implements optimization functions using PuLP solver via Pyodide
// In a real implementation, these would make API calls to the Python backend

import { Device, electricityPrices, solarForecast as mockSolarForecast } from '../mock/data';
import { loadCSV } from './csvLoader';

export interface OptimizationResult {
  deviceId: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
  estimatedSavings: number;
  confidence: number;
}

export interface UserConstraint {
  startTimeRange: string;
  endTimeRange: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SolarApiConfig {
  apiKey: string;
  resourceId: string;
  enabled: boolean;
}

// Global variable to store real solar forecast data
let realSolarForecast: typeof mockSolarForecast | null = null;

// Global variable to store the Pyodide instance
let pyodideInstance: any = null;

// Function to update the solar forecast data
export const updateSolarForecast = (forecast: typeof mockSolarForecast) => {
  realSolarForecast = forecast;
};

// Function to check if we have real solar data
export const hasRealSolarData = (): boolean => {
  return realSolarForecast !== null && realSolarForecast.length > 0;
};

// Function to get current solar forecast (real or mock)
export const getCurrentSolarForecast = (): typeof mockSolarForecast => {
  return realSolarForecast || mockSolarForecast;
};

// Initialize Pyodide and PuLP
export const initPyodide = async () => {
  if (!pyodideInstance) {
    try {
      console.log("Initializing Pyodide...");
      // Import Pyodide dynamically
      const { loadPyodide } = await import("pyodide");
      
      // Load the Pyodide runtime
      pyodideInstance = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
      });
      
      // Install PuLP package
      await pyodideInstance.loadPackagesFromImports(`
        import micropip
        await micropip.install('pulp')
      `);
      
      console.log("Pyodide and PuLP initialized successfully");
      
      // Define the PuLP optimization function in Python
      await pyodideInstance.runPythonAsync(`
        from pulp import *
        import json
        
        def optimize_schedule(device_power, hours, prices, solar_output, constraints=None):
            """
            Optimize device schedule using PuLP linear programming solver.
            
            Parameters:
            device_power (float): Device power consumption in kW
            hours (list): List of hours (0-23)
            prices (list): Electricity price for each hour
            solar_output (list): Solar power output for each hour
            constraints (dict, optional): User constraints
            
            Returns:
            dict: Optimization results with recommended times and savings
            """
            # Create the model
            model = LpProblem(name="device_schedule_optimization", sense=LpMinimize)
            
            # Create a binary variable for each hour indicating if the device is running
            x = {h: LpVariable(f"x_{h}", cat=LpBinary) for h in hours}
            
            # Calculate the net cost for each hour (price - solar benefit)
            net_costs = []
            for i, hour in enumerate(hours):
                # Convert solar output to kW if needed to match device_power
                solar_benefit = min(solar_output[i], device_power) * prices[i]
                net_cost = (device_power * prices[i]) - solar_benefit
                net_costs.append(net_cost)
            
            # Objective: minimize total cost
            model += lpSum([x[h] * net_costs[i] for i, h in enumerate(hours)])
            
            # Constraint: device must run for required duration
            if constraints and 'duration' in constraints:
                duration = constraints['duration']
            else:
                duration = 1  # Default duration
                
            model += lpSum([x[h] for h in hours]) == duration
            
            # User time window constraints
            if constraints and 'start_hour' in constraints and 'end_hour' in constraints:
                start_hour = constraints['start_hour']
                end_hour = constraints['end_hour']
                priority = constraints.get('priority', 'medium')
                
                # For high priority, strictly enforce time window
                if priority == 'high':
                    for h in hours:
                        h_val = int(h)
                        # If outside time window, set variable to 0
                        if not (start_hour <= h_val <= end_hour or 
                               (end_hour < start_hour and (h_val >= start_hour or h_val <= end_hour))):
                            model += x[h] == 0
                # For medium priority, add penalty for running outside window
                elif priority == 'medium':
                    penalty_vars = {h: LpVariable(f"penalty_{h}", 0, 1, LpContinuous) for h in hours}
                    for h in hours:
                        h_val = int(h)
                        # If outside time window
                        if not (start_hour <= h_val <= end_hour or 
                               (end_hour < start_hour and (h_val >= start_hour or h_val <= end_hour))):
                            # Add penalty relation
                            model += penalty_vars[h] >= x[h]
                            # Add penalty to objective
                            model += 10 * penalty_vars[h]  # Arbitrary penalty weight
                # For low priority, prefer the window but allow outside if much better
                # (this is handled naturally by the objective function)
            
            # Solve the model
            model.solve(solver=PULP_CBC_CMD(msg=False))
            
            # Get the solution
            if model.status == LpStatusOptimal:
                # Find when the device is scheduled to run
                scheduled_hours = [h for h in hours if value(x[h]) > 0.5]
                scheduled_hours.sort(key=lambda h: int(h))
                
                # Calculate savings compared to worst time
                worst_hour_index = net_costs.index(max(net_costs))
                worst_hour_cost = net_costs[worst_hour_index] * duration
                
                optimal_cost = sum(net_costs[hours.index(h)] for h in scheduled_hours)
                savings = worst_hour_cost - optimal_cost
                
                # Calculate confidence score (higher for better solutions)
                # Base on the ratio of savings to worst possible cost
                if worst_hour_cost > 0:
                    confidence = min((savings / worst_hour_cost) * 100, 100)
                else:
                    confidence = 90  # Default high confidence if costs are zero
                    
                # Adjust confidence based on constraints
                if constraints and constraints.get('priority') == 'high':
                    confidence *= 0.8  # High constraints reduce confidence as they may force suboptimal times
                
                # Format the results
                if not scheduled_hours:
                    return {"status": "error", "message": "No solution found"}
                    
                start_hour = min(scheduled_hours, key=lambda h: int(h))
                end_hour = max(scheduled_hours, key=lambda h: int(h))
                
                # If scheduled hours are not consecutive, we're using the full span
                # This is a simplification - in a real system you'd want to schedule more precisely
                return {
                    "status": "success",
                    "recommended_start_time": f"{start_hour}:00",
                    "recommended_end_time": f"{(int(end_hour) + 1) % 24:02d}:00",
                    "estimated_savings": round(savings, 2),
                    "confidence": round(confidence, 0),
                    "scheduled_hours": scheduled_hours
                }
            else:
                return {"status": "error", "message": "Failed to find optimal solution"}
      `);
      
      return true;
    } catch (error) {
      console.error("Error initializing Pyodide:", error);
      return false;
    }
  }
  return true;
};

// Optimizes a device schedule based on electricity prices and solar forecast
export const optimizeDeviceSchedule = async (
  device: Device,
  duration: number,
  constraints?: UserConstraint
): Promise<OptimizationResult> => {
  // Try to use PuLP optimization if Pyodide is available
  try {
    // Initialize Pyodide if not already done
    const pyodideReady = await initPyodide();
    
    if (pyodideReady && pyodideInstance) {
      console.log("Using PuLP solver for optimization");
      
      // Prepare data for the Python function
      const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
      
      // Get prices for each hour
      const prices = hours.map(hour => {
        const priceData = electricityPrices.find(p => p.timestamp === `${hour}:00`);
        return priceData ? priceData.price : 0.15; // Default price if not found
      });
      
      // Get solar output for each hour
      const currentSolarForecast = getCurrentSolarForecast();
      const solarOutput = hours.map(hour => {
        const solarData = currentSolarForecast.find(s => s.timestamp === `${hour}:00`);
        return solarData ? solarData.power : 0; // Default to 0 if not found
      });
      
      // Prepare constraints
      let pythonConstraints: any = { 'duration': duration };
      
      if (constraints) {
        const startHour = parseInt(constraints.startTimeRange.split(':')[0]);
        const endHour = parseInt(constraints.endTimeRange.split(':')[0]);
        
        pythonConstraints = {
          ...pythonConstraints,
          'start_hour': startHour,
          'end_hour': endHour,
          'priority': constraints.priority
        };
      }
      
      // Convert device power from watts to kilowatts
      const devicePowerKW = device.powerConsumption / 1000;
      
      try {
        // Call the Python optimization function
        const result = await pyodideInstance.runPythonAsync(`
          # Convert inputs to Python types
          device_power = float(${devicePowerKW})
          hours = ${JSON.stringify(hours)}
          prices = ${JSON.stringify(prices)}
          solar_output = ${JSON.stringify(solarOutput)}
          constraints = ${JSON.stringify(pythonConstraints)}
          
          # Run optimization
          result = optimize_schedule(device_power, hours, prices, solar_output, constraints)
          
          # Return JSON result
          json.dumps(result)
        `);
        
        const optimizationResult = JSON.parse(result);
        
        if (optimizationResult.status === "success") {
          return {
            deviceId: device.id,
            recommendedStartTime: optimizationResult.recommended_start_time,
            recommendedEndTime: optimizationResult.recommended_end_time,
            estimatedSavings: optimizationResult.estimated_savings,
            confidence: optimizationResult.confidence
          };
        }
      } catch (innerError) {
        console.error("Error in Python execution:", innerError);
        throw innerError;
      }
    }
    
    console.log("Falling back to heuristic optimization");
  } catch (error) {
    console.error("Error in PuLP optimization:", error);
    console.log("Falling back to heuristic optimization");
  }
  
  // Fall back to the heuristic approach if PuLP fails
  return fallbackOptimizeDeviceSchedule(device, duration, constraints);
};

// Fallback optimization function using the original heuristic approach
const fallbackOptimizeDeviceSchedule = (
  device: Device,
  duration: number,
  constraints?: UserConstraint
): OptimizationResult => {
  // Create a combined score for each hour (solar score - price score)
  const hourlyScores: {hour: string, score: number}[] = [];
  
  // Use real solar data if available, otherwise use mock data
  const currentSolarForecast = getCurrentSolarForecast();
  
  // Normalize both datasets to 0-1 scale for fair comparison
  const maxPrice = Math.max(...electricityPrices.map(p => p.price));
  const maxSolar = Math.max(...currentSolarForecast.map(s => s.power));
  
  // Filter time range based on user constraints if provided
  let validHours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
  
  if (constraints) {
    const startHour = parseInt(constraints.startTimeRange.split(':')[0]);
    const endHour = parseInt(constraints.endTimeRange.split(':')[0]);
    
    // Create a list of valid hours based on constraints
    validHours = validHours.filter(hour => {
      const hourNum = parseInt(hour.split(':')[0]);
      
      // If end time is less than start time, it means we're spanning midnight
      if (endHour < startHour) {
        return hourNum >= startHour || hourNum <= endHour;
      }
      
      return hourNum >= startHour && hourNum <= endHour;
    });
  }
  
  for (const hour of validHours) {
    const hourNum = parseInt(hour.split(':')[0]);
    const priceData = electricityPrices.find(p => p.timestamp === hour);
    const solarData = currentSolarForecast.find(s => s.timestamp === hour);
    
    if (priceData && solarData) {
      // Invert price so lower prices get higher scores
      const priceScore = 1 - (priceData.price / maxPrice);
      const solarScore = solarData.power / maxSolar;
      
      // Weight scores based on priority if constraints are provided
      let priorityWeight = 0.5; // Default medium priority
      
      if (constraints) {
        switch (constraints.priority) {
          case 'low':
            priorityWeight = 0.3; // More freedom for algorithm, less focus on time window
            break;
          case 'medium':
            priorityWeight = 0.5; // Balance between constraints and optimization
            break;
          case 'high':
            priorityWeight = 0.8; // Strongly prefer the user's time window
            break;
        }
      }
      
      // Calculate combined score - weighting solar and price differently based on priority
      // For high priority, we care less about optimal energy/price and more about user's window
      const combinedScore = (solarScore * (1 - priorityWeight) * 0.7) +
                            (priceScore * (1 - priorityWeight) * 0.3) +
                            (priorityWeight); // Add priority weight directly to increase score for valid hours
      
      hourlyScores.push({
        hour,
        score: combinedScore
      });
    }
  }
  
  // Sort by score
  hourlyScores.sort((a, b) => b.score - a.score);
  
  // If no valid hours found (unlikely but possible with constraints)
  if (hourlyScores.length === 0) {
    return {
      deviceId: device.id,
      recommendedStartTime: "No valid time",
      recommendedEndTime: "No valid time",
      estimatedSavings: 0,
      confidence: 0
    };
  }
  
  // Get the best starting hour
  const bestStartHour = hourlyScores[0].hour;
  
  // Calculate end time (simple for now)
  const startHourNum = parseInt(bestStartHour.split(':')[0]);
  const endHourNum = (startHourNum + duration) % 24;
  const endHour = endHourNum.toString().padStart(2, '0') + ':00';
  
  // Simulate savings calculation
  // Compare best time electricity cost vs. worst time
  const worstHour = hourlyScores[hourlyScores.length - 1].hour;
  const worstHourPrice = electricityPrices.find(p => p.timestamp === worstHour)?.price || 0;
  const bestHourPrice = electricityPrices.find(p => p.timestamp === bestStartHour)?.price || 0;
  
  const priceDifference = worstHourPrice - bestHourPrice;
  const consumptionKWh = device.powerConsumption / 1000 * duration;
  const estimatedSavings = priceDifference * consumptionKWh;
  
  // Confidence is affected by constraints - tighter constraints = lower confidence
  // Also boost confidence if using real data
  let confidenceMultiplier = hasRealSolarData() ? 1.2 : 1;
  
  if (constraints && constraints.priority === 'high') {
    confidenceMultiplier *= 0.8; // High priority constraints might force less optimal times
  }
  
  // Cap confidence at 100
  const confidence = Math.min(hourlyScores[0].score * 100 * confidenceMultiplier, 100);

  // At the end, ensure we return a properly structured result:
  return {
    deviceId: device.id,
    recommendedStartTime: bestStartHour,
    recommendedEndTime: endHour,
    estimatedSavings: parseFloat(estimatedSavings.toFixed(2)) || 0,
    confidence: parseFloat(confidence.toFixed(0)) || 0
  };
};

// Function to get daily savings estimate based on optimized schedules
export const calculateDailySavings = (devices: Device[]): number => {
  const schedulableDevices = devices.filter(d => d.schedulable);
  
  return schedulableDevices.reduce((total, device) => {
    const deviceSavings = device.schedules?.[0]?.savings || 0;
    return total + deviceSavings;
  }, 0);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Load optimization data from CSV files
export const loadOptimizationDataFromCSV = async () => {
  try {
    const energyUsage = await loadCSV('/data/energy_usage.csv');
    const deviceOptimizations = await loadCSV('/data/device_optimizations.csv');
    const timeSlots = await loadCSV('/data/time_slots.csv');
    const costBreakdown = await loadCSV('/data/cost_breakdown.csv');
    const costDistribution = await loadCSV('/data/cost_distribution.csv');
    const costByType = await loadCSV('/data/cost_by_type.csv');
    
    return {
      energyUsage,
      deviceOptimizations,
      timeSlots,
      costBreakdown,
      costDistribution,
      costByType
    };
  } catch (error) {
    console.error("Error loading optimization data from CSV:", error);
    return null;
  }
};