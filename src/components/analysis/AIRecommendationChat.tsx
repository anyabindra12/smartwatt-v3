
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { BrainCircuit, MessageSquare, Send, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const promptSuggestions = [
  "How can I reduce my washing machine's energy usage?",
  "When is the best time to charge my EV?",
  "How much could I save by replacing my old refrigerator?",
  "What's the best temperature setting for my thermostat?",
  "How do I optimize my solar panel usage?"
];

const AIRecommendationChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      content: "Hello! I'm your AI energy assistant. How can I help you optimize your energy usage today?",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      generateAIResponse(newUserMessage.content);
      setIsLoading(false);
    }, 1000);
  };

  const generateAIResponse = (query: string) => {
    let response = "";

    // Simple response generation based on keywords in the query
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("washing machine")) {
      response = "Based on your usage patterns, running your washing machine between 10:00-14:00 could save you about 30% on energy costs by utilizing your solar production. Also, using cold water cycles can reduce energy usage by up to 90% compared to hot water cycles.";
    } else if (lowerQuery.includes("ev") || lowerQuery.includes("electric vehicle") || lowerQuery.includes("charging")) {
      response = "The optimal time to charge your EV is typically between 02:00-06:00 when electricity rates are lowest. With your current usage pattern, you could save approximately €42.30 per month by shifting to these hours.";
    } else if (lowerQuery.includes("refrigerator")) {
      response = "Your current refrigerator consumes about 2.5 kWh per day. A modern energy-efficient model would use only 1.0-1.5 kWh, potentially saving you €18.25 monthly. The initial investment would be recovered in approximately 2.5 years.";
    } else if (lowerQuery.includes("thermostat") || lowerQuery.includes("temperature")) {
      response = "Reducing your heating temperature by just 1°C during winter could save up to 10% on your heating costs. I recommend setting your thermostat to 20°C during sleeping hours instead of the current 22°C.";
    } else if (lowerQuery.includes("solar")) {
      response = "Your solar production peaks between 10:00-14:00. To maximize self-consumption, try to run energy-intensive appliances like washing machines, dishwashers, and EV charging during these hours. Based on your current usage patterns, this could increase your solar self-consumption by 35%.";
    } else {
      response = "That's an interesting question about energy optimization. Looking at your usage patterns, I recommend focusing on shifting your high-consumption devices to off-peak hours or times when your solar production is highest. Would you like me to analyze a specific device or area in more detail?";
    }

    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      content: response,
      sender: "ai",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // Optional: auto-send the suggestion
    // setInputValue("");
    // const newUserMessage = {
    //   id: `user-${Date.now()}`,
    //   content: suggestion,
    //   sender: "user",
    //   timestamp: new Date()
    // };
    // setMessages(prev => [...prev, newUserMessage]);
    // setIsLoading(true);
    // setTimeout(() => {
    //   generateAIResponse(suggestion);
    //   setIsLoading(false);
    // }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Energy Assistant Chat
        </CardTitle>
        <CardDescription>
          Ask questions about your energy usage and get personalized recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-y-auto pb-0">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.sender === "user"
                    ? "flex-row-reverse"
                    : "flex-row"
                }`}
              >
                <Avatar className={`h-8 w-8 ${
                  message.sender === "ai" 
                    ? "bg-primary/10 text-primary"
                    : "bg-muted"
                }`}>
                  {message.sender === "ai" ? (
                    <BrainCircuit className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Avatar>
                
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                  <BrainCircuit className="h-4 w-4" />
                </Avatar>
                <div className="px-4 py-3 rounded-lg bg-muted flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <div className="px-4 py-2">
        <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {promptSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
      
      <CardFooter className="pt-0">
        <div className="flex w-full items-center gap-2">
          <Input
            placeholder="Type your question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default AIRecommendationChat;
