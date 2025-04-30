import React from "react";

const ForecastPlot = () => {
  return (
    <div>
      <h2>24h Price Forecast</h2>
      <img
        src="http://localhost:8000/forecast-plot"
        alt="Electricity Price Forecast"
        style={{ width: "100%", maxWidth: "800px" }}
      />
    </div>
  );
};

export default ForecastPlot;
