
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, BarChart3, ChartPieIcon, Brain, BrainCircuit, LineChart, PieChart, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import CostAnalysis from "@/components/analysis/CostAnalysis";
import OptimizationReport from "@/components/analysis/OptimizationReport";
import AIRecommendations from "@/components/analysis/AIRecommendations";

const Analysis = () => {
  // Set the default tab to "cost" to immediately show the cost analysis with pie charts
  const [activeTab, setActiveTab] = useState("cost");
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Energy Analysis</h1>
            <p className="text-muted-foreground">
              Detailed insights into your energy consumption, costs, and optimization opportunities
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full max-w-2xl">
              <TabsTrigger value="cost" className="flex items-center">
                <PieChart className="mr-2 h-4 w-4" />
                Cost Analysis
              </TabsTrigger>
              {/* <TabsTrigger value="optimization" className="flex items-center">
                <LineChart className="mr-2 h-4 w-4" />
                Optimization Reports
              </TabsTrigger> */}
              <TabsTrigger value="ai" className="flex items-center">
                <BrainCircuit className="mr-2 h-4 w-4" />
                AI Recommendations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="cost">
              <CostAnalysis defaultTab="breakdown" />
            </TabsContent>
            
            <TabsContent value="optimization">
              <OptimizationReport />
            </TabsContent>
            
            <TabsContent value="ai">
              <AIRecommendations />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Analysis;
