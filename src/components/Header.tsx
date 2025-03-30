
import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, Calendar, Home, PlugZap } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const Header = () => {
  return (
    <header className="border-b py-4 px-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full smartwatt-gradient flex items-center justify-center">
                <span className="text-white font-bold text-sm">SW</span>
              </div>
              <span className="text-xl font-bold">SmartWatt</span>
            </Link>
            
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/schedule">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/devices">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      <PlugZap className="mr-2 h-4 w-4" />
                      Devices
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/analysis">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analysis
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs py-1 px-2 rounded-full">
              Connected
            </div>
            <div className="text-sm text-muted-foreground">
              System status: <span className="font-medium text-foreground">Optimizing</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
