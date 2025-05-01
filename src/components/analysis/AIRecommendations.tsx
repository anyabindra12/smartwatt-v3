
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { devices, electricityPrices, solarForecast } from "@/mock/data";
import { formatCurrency } from "@/utils/optimizationHelpers";
import { AlertCircle, BrainCircuit, Check, ChevronRight, Lightbulb, MessageSquare, RefreshCw, ThumbsUp, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AIRecommendationChat from "./AIRecommendationChat";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "schedule" | "device" | "behavior";
  details: string[];
  estimatedSavings: number;
}

// Mock recommendations that would come from an AI model
const mockRecommendations: Recommendation[] = [
  {
    id: "rec1",
    title: "Shift Washing Machine Usage to Solar Peak Hours",
    description: "Your washing machine consumes significant power. Running it during solar peak hours (10:00-14:00) would reduce grid electricity usage.",
    impact: "high",
    category: "schedule",
    details: [
      "Current usage pattern shows operation primarily in evening hours (18:00-21:00)",
      "Electricity prices are 40% higher during your current usage time",
      "Solar production peaks between 10:00-14:00, providing nearly free energy",
      "This change alone could reduce washing machine energy costs by up to 60%"
    ],
    estimatedSavings: 24.50
  },
  {
    id: "rec2",
    title: "Optimize EV Charging Schedule",
    description: "Your electric vehicle charging pattern could be optimized to take advantage of lower electricity rates and solar generation.",
    impact: "high",
    category: "schedule",
    details: [
      "Current charging begins immediately upon plugging in, regardless of electricity rates",
      "Recommend setting charging to start at 02:00 when rates drop by 50%",
      "If charging during the day, optimal time is 11:00-15:00 to utilize solar generation",
      "Smart charging could save approximately $42.30 per month"
    ],
    estimatedSavings: 42.30
  },
  {
    id: "rec3",
    title: "Replace Older Refrigerator",
    description: "Your refrigerator is consuming 30% more energy than modern energy-efficient models. Consider replacing it.",
    impact: "medium",
    category: "device",
    details: [
      "Current refrigerator consumes approximately 2.5 kWh per day",
      "Modern energy-efficient models consume about 1.0-1.5 kWh per day",
      "Initial investment would be recovered in approximately 2.5 years",
      "Additional benefits include better temperature control and less food spoilage"
    ],
    estimatedSavings: 18.25
  },
  {
    id: "rec4",
    title: "Implement Standby Power Management",
    description: "Several devices in your home consume significant standby power. Using smart plugs or power strips could eliminate this waste.",
    impact: "low",
    category: "behavior",
    details: [
      "Identified 7 devices with standby power over 2W each",
      "Total standby power consumption is approximately 35W (0.84 kWh per day)",
      "Smart plugs or power strips can automatically cut power when devices are not in use",
      "Minimal lifestyle change with notable cumulative savings"
    ],
    estimatedSavings: 9.75
  },
  {
    id: "rec5",
    title: "Adjust Thermostat Settings",
    description: "Small adjustments to your heating/cooling schedule could yield significant energy savings with minimal comfort impact.",
    impact: "medium",
    category: "behavior",
    details: [
      "Reducing heating by 1°C during winter can save up to 10% on heating costs",
      "Currently maintaining 22°C consistently; recommend 20°C during sleeping hours",
      "Automated schedule can make these changes without requiring manual adjustment",
      "Expected comfort impact is minimal with appropriate bedding"
    ],
    estimatedSavings: 32.60
  }
];

const AIRecommendations = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [generatingNew, setGeneratingNew] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("recommendations");
  const { toast } = useToast();

  // Filter recommendations based on active category
  const filteredRecommendations = activeCategory === "all" 
    ? mockRecommendations 
    : mockRecommendations.filter(rec => rec.category === activeCategory);
  
  // Calculate total potential savings
  const totalPotentialSavings = mockRecommendations.reduce(
    (sum, rec) => sum + rec.estimatedSavings, 
    0
  );

  const handleGenerateNew = () => {
    setGeneratingNew(true);
    
    // Simulate AI generation process
    setTimeout(() => {
      setGeneratingNew(false);
      toast({
        title: "New recommendations generated",
        description: "We've analyzed your latest usage patterns and updated your recommendations.",
        variant: "default",
      });
    }, 2000);
  };

  const handleApplyRecommendation = (recommendation: Recommendation) => {
    toast({
      title: "Recommendation applied",
      description: `"${recommendation.title}" has been applied to your schedule.`,
      variant: "default",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="recommendations" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat Assistant
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    AI Energy Recommendations
                  </CardTitle>
                  <CardDescription>
                    Smart suggestions based on your energy usage patterns and device behavior
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateNew}
                  disabled={generatingNew}
                >
                  {generatingNew ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Analysis
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                  <Zap className="h-3 w-3 mr-1" />
                  Potential Monthly Savings: {formatCurrency(totalPotentialSavings)}
                </Badge>
                <Badge variant="outline">
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  5 Recommendations
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" onValueChange={setActiveCategory}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="schedule">Scheduling</TabsTrigger>
                  <TabsTrigger value="device">Devices</TabsTrigger>
                  <TabsTrigger value="behavior">Behavior</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="space-y-4">
                {filteredRecommendations.map((recommendation) => (
                  <Card key={recommendation.id} className="border-l-4" style={{
                    borderLeftColor: recommendation.impact === 'high' 
                      ? 'rgb(220, 38, 38)' // text-red-600
                      : recommendation.impact === 'medium'
                        ? 'rgb(234, 179, 8)' // text-yellow-500
                        : 'rgb(34, 197, 94)' // text-green-500
                  }}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-medium">
                          {recommendation.title}
                        </CardTitle>
                        <Badge className={
                          recommendation.impact === 'high' 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : recommendation.impact === 'medium'
                              ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }>
                          {recommendation.impact === 'high' ? 'High Impact' : 
                           recommendation.impact === 'medium' ? 'Medium Impact' : 'Low Impact'}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {recommendation.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="pl-4 border-l-2 border-muted mb-3">
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {recommendation.details.map((detail, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2 mt-1 text-xs">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Zap className="h-4 w-4 mr-1 text-green-500" />
                        <span>Estimated Monthly Savings: <span className="font-medium text-green-600">{formatCurrency(recommendation.estimatedSavings)}</span></span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Badge variant="outline">
                        {recommendation.category === 'schedule' ? 'Scheduling' : 
                         recommendation.category === 'device' ? 'Device Upgrade' : 'Behavior Change'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="hover:bg-green-50 hover:text-green-600"
                        onClick={() => handleApplyRecommendation(recommendation)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Apply Recommendation
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                {filteredRecommendations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No recommendations found</h3>
                    <p className="text-muted-foreground mt-1">
                      There are no recommendations in this category. Try selecting a different category.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>How AI Generates Recommendations</CardTitle>
              <CardDescription>
                Understanding the AI analysis process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-medium">Data Analysis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The AI analyzes your energy consumption patterns, device usage times, and electricity rates to identify inefficiencies.
                  </p>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <BrainCircuit className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-medium">Pattern Recognition</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Using machine learning algorithms, the system identifies opportunities for optimization based on similar households.
                  </p>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="font-medium">Recommendation Generation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The AI generates personalized recommendations prioritized by potential impact and ease of implementation.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 border rounded-md bg-primary/5">
                <div className="flex items-start gap-3">
                  <ThumbsUp className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium mb-1">Continuous Improvement</h3>
                    <p className="text-sm text-muted-foreground">
                      The AI system learns from your feedback and adapts recommendations over time. 
                      As you implement suggestions and your energy usage patterns change, the system will 
                      generate new, more relevant recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="chat">
          <AIRecommendationChat />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIRecommendations;
