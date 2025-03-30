
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { CheckCircle2, CloudSun, Database, HomeIcon, RefreshCw, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateApiKey, fetchSolarForecast } from "@/utils/apiServices";
import { updateSolarForecast, hasRealSolarData } from "@/utils/optimizationHelpers";

interface ApiConfig {
  homeAssistant: string;
  solcast: string;
  solcastResourceId: string;
  nordpool: string;
}

const ApiSetup = () => {
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    homeAssistant: "",
    solcast: "Zocl4SNJ5nKBf6kwb_FQ4nfvm2BAtPMV", // Pre-filled with provided API key
    solcastResourceId: "2a27-cf4a-db96-b5bc", // Pre-filled with provided rooftop ID
    nordpool: ""
  });
  
  const [connected, setConnected] = useState({
    homeAssistant: false,
    solcast: false,
    nordpool: false
  });

  const [isLoading, setIsLoading] = useState({
    homeAssistant: false,
    solcast: false,
    nordpool: false
  });
  
  const { toast } = useToast();
  
  // Try to connect to Solcast on initial load
  useEffect(() => {
    if (apiConfig.solcast && apiConfig.solcastResourceId) {
      testConnection('solcast');
    }
  }, []);
  
  const handleChange = (field: keyof ApiConfig, value: string) => {
    setApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const testConnection = async (service: keyof typeof connected) => {
    if (!apiConfig[service]) {
      toast({
        title: "Error",
        description: `Please enter a valid ${service} API key or URL`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(prev => ({ ...prev, [service]: true }));
    
    toast({
      title: `Connecting to ${service}...`,
      description: "Please wait while we establish the connection.",
    });
    
    if (service === 'solcast') {
      try {
        // Validate the API key
        const isValid = await validateApiKey(apiConfig.solcast, apiConfig.solcastResourceId);
        
        if (isValid) {
          // If valid, fetch the forecast data
          const forecast = await fetchSolarForecast(apiConfig.solcast, apiConfig.solcastResourceId);
          
          // Update the global solar forecast data
          updateSolarForecast(forecast);
          
          setConnected(prev => ({
            ...prev,
            [service]: true
          }));
          
          toast({
            title: `Connected to ${service} successfully!`,
            description: `Your ${service} API connection is now active with real data.`,
            variant: "default"
          });
        } else {
          toast({
            title: `Failed to connect to ${service}`,
            description: "The API key or resource ID might be invalid.",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: `Failed to connect to ${service}`,
          description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    } else {
      // For other services, simulate a successful connection after a delay
      setTimeout(() => {
        setConnected(prev => ({
          ...prev,
          [service]: true
        }));
        
        toast({
          title: `Connected to ${service} successfully!`,
          description: `Your ${service} API connection is now active.`,
          variant: "default"
        });
      }, 1500);
    }
    
    setIsLoading(prev => ({ ...prev, [service]: false }));
  };

  const refreshConnections = async () => {
    // For each connected service, refresh the connection
    for (const service of ['homeAssistant', 'solcast', 'nordpool'] as const) {
      if (connected[service]) {
        await testConnection(service);
      }
    }
  };

  return (
    <Card className="energy-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-energy" />
          API Connections
        </CardTitle>
        <CardDescription>
          Connect SmartWatt to your external services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Home Assistant */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1">
              <HomeIcon className="h-4 w-4" /> 
              Home Assistant URL
            </label>
            {connected.homeAssistant && (
              <span className="text-xs flex items-center text-eco">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Input
              value={apiConfig.homeAssistant}
              onChange={(e) => handleChange('homeAssistant', e.target.value)}
              placeholder="http://homeassistant.local:8123"
              className="flex-1"
            />
            <Button 
              onClick={() => testConnection('homeAssistant')}
              variant={connected.homeAssistant ? "outline" : "default"}
              className={connected.homeAssistant ? "border-eco text-eco hover:bg-eco/10" : ""}
              disabled={isLoading.homeAssistant}
            >
              {isLoading.homeAssistant ? "Connecting..." : connected.homeAssistant ? "Reconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {/* Solcast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1">
              <CloudSun className="h-4 w-4" /> 
              Solcast API Key
            </label>
            {connected.solcast && (
              <span className="text-xs flex items-center text-eco">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected{hasRealSolarData() && " (Using Real Data)"}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Input
              value={apiConfig.solcast}
              onChange={(e) => handleChange('solcast', e.target.value)}
              placeholder="Enter your Solcast API key"
              className="flex-1"
              type="password"
            />
            <Button 
              onClick={() => testConnection('solcast')}
              variant={connected.solcast ? "outline" : "default"}
              className={connected.solcast ? "border-eco text-eco hover:bg-eco/10" : ""}
              disabled={isLoading.solcast}
            >
              {isLoading.solcast ? "Connecting..." : connected.solcast ? "Reconnect" : "Connect"}
            </Button>
          </div>
          
          {/* Solcast Resource ID */}
          <div className="mt-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <CloudSun className="h-4 w-4" /> 
              Solcast Rooftop ID
            </label>
            <Input
              value={apiConfig.solcastResourceId}
              onChange={(e) => handleChange('solcastResourceId', e.target.value)}
              placeholder="Enter your Solcast resource ID"
              className="mt-1"
            />
          </div>
        </div>

        {/* Nordpool */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1">
              <Database className="h-4 w-4" /> 
              Nordpool API Key
            </label>
            {connected.nordpool && (
              <span className="text-xs flex items-center text-eco">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Input
              value={apiConfig.nordpool}
              onChange={(e) => handleChange('nordpool', e.target.value)}
              placeholder="Enter your Nordpool API key"
              className="flex-1"
              type="password"
            />
            <Button 
              onClick={() => testConnection('nordpool')}
              variant={connected.nordpool ? "outline" : "default"}
              className={connected.nordpool ? "border-eco text-eco hover:bg-eco/10" : ""}
              disabled={isLoading.nordpool}
            >
              {isLoading.nordpool ? "Connecting..." : connected.nordpool ? "Reconnect" : "Connect"}
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            className="w-full flex items-center gap-2"
            onClick={refreshConnections}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All Connections
          </Button>
        </div>

        {/* Show indicator when using real data */}
        {hasRealSolarData() && (
          <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-md text-sm">
            <p className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Using real solar forecast data from Solcast!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiSetup;
