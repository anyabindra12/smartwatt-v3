import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const sensors = {
  "sensor.maya_fan_power": "💨 Fan Power (W)",
  "sensor.maya_solar_panel": "☀️ Solar Panel (W)",
  "sensor.maya_fan_current": "⚡ Fan Current (A)",
  "sensor.maya_fan_voltage": "🔋 Fan Voltage (V)",
};

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({});

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:5055/api/sensor_data");
      const json = await res.json();
      setSensorData(json);
    } catch (err) {
      console.error("Failed to fetch sensor data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>📊 SmartWatt React Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {Object.entries(sensors).map(([sensor, label]) => {
          const data = sensorData[sensor] || [];
          const chartData = {
            labels: data.map((d) => new Date(d.t).toLocaleTimeString()),
            datasets: [
              {
                label: label,
                data: data.map((d) => d.y),
                fill: false,
                borderColor: "#0d6efd",
                tension: 0.2,
              },
            ],
          };

          return (
            <div
              key={sensor}
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <h3>{label}</h3>
              <Line data={chartData} options={{ responsive: true }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
