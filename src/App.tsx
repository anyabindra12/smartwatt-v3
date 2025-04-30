
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import Devices from "./pages/Devices";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound";
import { initPyodide } from "./utils/optimizationHelpers";

const queryClient = new QueryClient();

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then((res) => res.json())
      .then((data) => setMessage(data.Hello))
      .catch((err) => console.error('API error:', err));
  }, []);

  return (
    <div>
      <h1>Backend says: {message}</h1>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} /> {/* Render Index.tsx as homepage */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// const App = () => {
//   // Initialize Pyodide when app loads
//   useEffect(() => {
//     // Initialize Pyodide in the background
//     const initOptimizationEngine = async () => {
//       try {
//         await initPyodide();
//         console.log("Optimization engine initialized successfully");
//       } catch (error) {
//         console.error("Failed to initialize optimization engine:", error);
//       }
//     };
    
//     initOptimizationEngine();
//   }, []);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <TooltipProvider>
//         <Toaster />
//         <Sonner />
//         <BrowserRouter>
//           <Routes>
//             <Route path="/" element={<Index />} />
//             <Route path="/schedule" element={<Schedule />} />
//             <Route path="/devices" element={<Devices />} />
//             <Route path="/analysis" element={<Analysis />} />
//             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//             <Route path="*" element={<NotFound />} />
//           </Routes>
//         </BrowserRouter>
//       </TooltipProvider>
//     </QueryClientProvider>
//   );
// };

export default App;