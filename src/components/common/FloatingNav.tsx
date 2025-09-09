import React from 'react';
import { Home, Star, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

const FloatingNav: React.FC<FloatingNavProps> = ({
  activeSection,
  onSectionChange,
  className
}) => {
  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      color: 'text-blue-600'
    },
    {
      id: 'features',
      icon: Star,
      label: 'Features',
      color: 'text-purple-600'
    },
    {
      id: 'pricing',
      icon: DollarSign,
      label: 'Pricing',
      color: 'text-green-600'
    }
  ];

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
      "bg-background/80 backdrop-blur-lg border border-border/50 rounded-full shadow-lg",
      "p-2 flex items-center space-x-2",
      "animate-fade-in",
      className
    )}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <Button
            key={item.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "relative rounded-full h-12 w-12 p-0 transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isActive && "shadow-md",
              !isActive && "hover:bg-muted/60"
            )}
          >
            <Icon 
              className={cn(
                "h-5 w-5 transition-colors duration-200",
                isActive ? "text-primary-foreground" : item.color
              )} 
            />
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
            )}
          </Button>
        );
      })}
      
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />
    </div>
  );
};

export default FloatingNav;