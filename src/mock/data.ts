
export interface EnergyData {
  timestamp: string;
  value: number;
  type: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  powerConsumption: number;
  isRunning: boolean;
  icon: string;
  schedulable: boolean;
  schedules?: Schedule[];
}

export interface Schedule {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  isOptimized: boolean;
  savings: number;
}

export interface PriceData {
  timestamp: string;
  price: number;
}

export interface SolarForecast {
  timestamp: string;
  power: number;
}

// Mock energy consumption data
export const energyConsumptionData: EnergyData[] = [
  { timestamp: '00:00', value: 1.2, type: 'grid' },
  { timestamp: '01:00', value: 0.9, type: 'grid' },
  { timestamp: '02:00', value: 0.7, type: 'grid' },
  { timestamp: '03:00', value: 0.5, type: 'grid' },
  { timestamp: '04:00', value: 0.8, type: 'grid' },
  { timestamp: '05:00', value: 1.1, type: 'grid' },
  { timestamp: '06:00', value: 1.5, type: 'grid' },
  { timestamp: '07:00', value: 2.0, type: 'grid' },
  { timestamp: '08:00', value: 2.2, type: 'grid' },
  { timestamp: '09:00', value: 1.9, type: 'solar' },
  { timestamp: '10:00', value: 1.6, type: 'solar' },
  { timestamp: '11:00', value: 1.4, type: 'solar' },
  { timestamp: '12:00', value: 1.7, type: 'solar' },
  { timestamp: '13:00', value: 2.1, type: 'solar' },
  { timestamp: '14:00', value: 2.3, type: 'solar' },
  { timestamp: '15:00', value: 2.0, type: 'solar' },
  { timestamp: '16:00', value: 1.8, type: 'grid' },
  { timestamp: '17:00', value: 2.2, type: 'grid' },
  { timestamp: '18:00', value: 2.7, type: 'grid' },
  { timestamp: '19:00', value: 2.5, type: 'grid' },
  { timestamp: '20:00', value: 2.3, type: 'grid' },
  { timestamp: '21:00', value: 2.0, type: 'grid' },
  { timestamp: '22:00', value: 1.6, type: 'grid' },
  { timestamp: '23:00', value: 1.3, type: 'grid' },
];

// Mock devices
export const devices: Device[] = [
  {
    id: '1',
    name: 'Washing Machine',
    type: 'appliance',
    powerConsumption: 900,
    isRunning: false,
    icon: 'washer',
    schedulable: true,
    schedules: [
      {
        id: 's1',
        deviceId: '1',
        startTime: '13:00',
        endTime: '14:30',
        isOptimized: true,
        savings: 0.45,
      }
    ]
  },
  {
    id: '2',
    name: 'Dishwasher',
    type: 'appliance',
    powerConsumption: 1200,
    isRunning: false,
    icon: 'dishwasher',
    schedulable: true,
    schedules: [
      {
        id: 's2',
        deviceId: '2',
        startTime: '12:00',
        endTime: '13:30',
        isOptimized: true,
        savings: 0.52,
      }
    ]
  },
  {
    id: '3',
    name: 'Water Heater',
    type: 'heating',
    powerConsumption: 2000,
    isRunning: true,
    icon: 'flame',
    schedulable: true,
    schedules: [
      {
        id: 's3',
        deviceId: '3',
        startTime: '10:00',
        endTime: '15:00',
        isOptimized: true,
        savings: 1.28,
      }
    ]
  },
  {
    id: '4',
    name: 'EV Charger',
    type: 'mobility',
    powerConsumption: 7200,
    isRunning: false,
    icon: 'ev',
    schedulable: true,
    schedules: [
      {
        id: 's4',
        deviceId: '4',
        startTime: '22:00',
        endTime: '06:00',
        isOptimized: true,
        savings: 3.15,
      }
    ]
  },
  {
    id: '5',
    name: 'Kitchen Lights',
    type: 'lighting',
    powerConsumption: 120,
    isRunning: true,
    icon: 'lamp',
    schedulable: false,
  },
  {
    id: '6',
    name: 'Living Room AC',
    type: 'hvac',
    powerConsumption: 1800,
    isRunning: true,
    icon: 'aircon',
    schedulable: true,
    schedules: [
      {
        id: 's5',
        deviceId: '6',
        startTime: '18:00',
        endTime: '22:00',
        isOptimized: false,
        savings: 0,
      }
    ]
  },
];

// Mock electricity prices
export const electricityPrices: PriceData[] = [
  { timestamp: '00:00', price: 0.11 },
  { timestamp: '01:00', price: 0.10 },
  { timestamp: '02:00', price: 0.08 },
  { timestamp: '03:00', price: 0.08 },
  { timestamp: '04:00', price: 0.09 },
  { timestamp: '05:00', price: 0.10 },
  { timestamp: '06:00', price: 0.12 },
  { timestamp: '07:00', price: 0.14 },
  { timestamp: '08:00', price: 0.15 },
  { timestamp: '09:00', price: 0.14 },
  { timestamp: '10:00', price: 0.13 },
  { timestamp: '11:00', price: 0.12 },
  { timestamp: '12:00', price: 0.11 },
  { timestamp: '13:00', price: 0.10 },
  { timestamp: '14:00', price: 0.09 },
  { timestamp: '15:00', price: 0.10 },
  { timestamp: '16:00', price: 0.12 },
  { timestamp: '17:00', price: 0.15 },
  { timestamp: '18:00', price: 0.18 },
  { timestamp: '19:00', price: 0.21 },
  { timestamp: '20:00', price: 0.20 },
  { timestamp: '21:00', price: 0.17 },
  { timestamp: '22:00', price: 0.14 },
  { timestamp: '23:00', price: 0.12 },
];

// Mock solar power generation forecast
export const solarForecast: SolarForecast[] = [
  { timestamp: '00:00', power: 0 },
  { timestamp: '01:00', power: 0 },
  { timestamp: '02:00', power: 0 },
  { timestamp: '03:00', power: 0 },
  { timestamp: '04:00', power: 0 },
  { timestamp: '05:00', power: 0 },
  { timestamp: '06:00', power: 0.2 },
  { timestamp: '07:00', power: 0.8 },
  { timestamp: '08:00', power: 1.5 },
  { timestamp: '09:00', power: 2.8 },
  { timestamp: '10:00', power: 3.9 },
  { timestamp: '11:00', power: 4.7 },
  { timestamp: '12:00', power: 5.1 },
  { timestamp: '13:00', power: 5.0 },
  { timestamp: '14:00', power: 4.6 },
  { timestamp: '15:00', power: 3.8 },
  { timestamp: '16:00', power: 2.9 },
  { timestamp: '17:00', power: 1.9 },
  { timestamp: '18:00', power: 0.9 },
  { timestamp: '19:00', power: 0.3 },
  { timestamp: '20:00', power: 0 },
  { timestamp: '21:00', power: 0 },
  { timestamp: '22:00', power: 0 },
  { timestamp: '23:00', power: 0 },
];

// Stats
export const stats = {
  currentConsumption: 2.7,
  solarProduction: 3.5,
  gridConsumption: 0.0,
  gridFeedIn: 0.8,
  dailySavings: 2.35,
  monthlySavings: 42.18,
  optimizationEfficiency: 84,
};
