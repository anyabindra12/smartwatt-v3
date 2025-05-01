

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnergyData } from "@/mock/data";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type RawDataPoint = {
  time: string;
  value: number;
};

type ChartDataPoint = {
  time: string;
  value: number | null;
};

export function convertTime(isoString: string): string {
  const date = new Date(isoString);

  // Convert to local hour in Eastern Time
  const estHour = new Date(date.toLocaleString("en-US", {
    timeZone: "America/New_York"
  })).getHours();

  return estHour.toString().padStart(2, "0") + ":00";
}


export default function SequentialLiveChart() {
  const [rawData, setRawData] = useState<RawDataPoint[]>([]);
  const [windowStartIndex, setWindowStartIndex] = useState(0);
  const [displayData, setDisplayData] = useState<ChartDataPoint[]>([]);
  const [revealIndex, setRevealIndex] = useState(1);
  const [hourlyValues, setHourlyValues] = useState<Record<string, number>>({});

  // Load full JSON once
  useEffect(() => {
    // fetch("/solar_data.json")
    //   .then(res => res.json())
    //   .then((json: RawDataPoint[]) => {
    //     setRawData(json);
    //     const initialSlice = json.slice(0, 24);
    //     const initialized = initialSlice.map((point, i) => ({
    //       time: convertTime(point.time),
    //       value: i === 0 ? point.value : null
    //     }));
    //     setDisplayData(initialized);
    //     setRevealIndex(1);
    //     setWindowStartIndex(0);
    //   });
    fetch("/solar_data.json")
    .then(res => res.json())
    .then((json: RawDataPoint[]) => {
      // Map each item to its rounded hour
      const groupedByHour: Record<string, number> = {};

      for (const item of json) {
        const hour = convertTime(item.time);
        if (!(hour in groupedByHour)) {
          groupedByHour[hour] = item.value; // Use the first value seen per hour
        }
      }

      // Sort by hour and take 24 entries starting from 00:00 or current hour
      const orderedHours = Object.keys(groupedByHour).sort((a, b) =>
        parseInt(a) - parseInt(b)
      );

      const selectedHours = orderedHours.slice(0, 24); // can modify to use local time

      const window: ChartDataPoint[] = selectedHours.map(hour => ({
        time: hour,
        value: null
      }));

      // Inject only the first value
      window[0].value = groupedByHour[window[0].time];

      setRawData(json); // keep raw data if needed
      setDisplayData(window);
      setRevealIndex(1);
      setWindowStartIndex(0);
      setHourlyValues(groupedByHour); // <-- add this state
  });

  }, []);

  // Reveal next point in current window every 2.5s
  useEffect(() => {
    if (rawData.length === 0 || revealIndex >= 24) return;

    const timer = setTimeout(() => {
      setDisplayData(prev =>
        prev.map((point, i) =>
          i === revealIndex
            ? {
                ...point,
                value: rawData[windowStartIndex + i].value
              }
            : point
        )
      );
      setRevealIndex(prev => prev + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [revealIndex, rawData, windowStartIndex]);

  // When one full 24-point window is revealed, shift to next window
  useEffect(() => {
    if (revealIndex === 24) {
      const nextStart = (windowStartIndex + 24) % rawData.length;
      const nextWindow = rawData.slice(nextStart, nextStart + 24);

      // If near the end and not enough points left, wrap around
      while (nextWindow.length < 24) {
        nextWindow.push(
          ...rawData.slice(0, 24 - nextWindow.length)
        );
      }

      const reset = nextWindow.map((point, i) => ({
        time: convertTime(point.time),
        value: i === 0 ? point.value : null
      }));

      const timer = setTimeout(() => {
        setDisplayData(reset);
        setRevealIndex(1);
        setWindowStartIndex(nextStart);
      }, 3000); // small pause before moving to next window

      return () => clearTimeout(timer);
    }
  }, [revealIndex, rawData, windowStartIndex]);


  return (
    <Card className="energy-card">
      <CardHeader>
        <CardTitle>Solar Power</CardTitle>
        <CardDescription>Amount of Solar Power Captured by the Panel in Real-Time</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={displayData}
          margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
        >
          <CartesianGrid stroke="#eee" strokeDasharray="4 4" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#000", fontSize: 12 }}
            label={{
              value: "Time of Day",
              position: "insideBottom",
              offset: -10,
              fill: "#000",
              style: { textAnchor: "middle", fill: "#000", fontSize: 12 }
            }}
          />
          <YAxis
            tick={{ fill: "#000", fontSize: 12 }}
            label={{
              value: "Power (kW)",
              angle: -90,
              position: "insideLeft",
              dx: -10,
              style: { textAnchor: "middle", fill: "#000", fontSize: 12 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "0.9rem"
            }}
            labelStyle={{ fontWeight: "bold" }}
            cursor={{ stroke: "#aaa", strokeWidth: 1 }}
          />
          <Line
            dataKey="value"
            stroke="#00b894"
            strokeWidth={3}
            dot={{ r: 3, stroke: "#00b894", strokeWidth: 2, fill: "#fff" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

