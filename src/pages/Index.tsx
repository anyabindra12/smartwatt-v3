import React from "react";
import Dashboard from "@/components/Dashboard";
import SolarForecast from "@/components/SolarForecast";

// 04/29 this is being rendered on front-page
const Index = () => {
  return (
    <div>
      {/* <h2>Welcome to the Dashboard</h2>  */}
      {/* <SolarForecast /> */}  
      <Dashboard /> {/* Render the Dashboard component */}
    </div>
  );
};

export default Index;





// import Dashboard from "@/components/Dashboard";

// const Index = () => {
//   return <Dashboard />;
// };

// export default Index;
