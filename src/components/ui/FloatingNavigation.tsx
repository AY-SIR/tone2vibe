import React, { useState, useEffect, useRef } from "react";
import { Home, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingNavigationProps {
  currentSection: "home" | "features" | "pricing";
  onSectionChange: (section: "home" | "features" | "pricing") => void;
}

export const FloatingNavigation = ({
  currentSection,
  onSectionChange,
}: FloatingNavigationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const lastScrollY = useRef(0);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollingTimer = useRef<NodeJS.Timeout | null>(null);

  const sections = [
    { name: "Features", icon: <FileText className="h-4 w-4" />, id: "features" },
    { name: "Home", icon: <Home className="h-4 w-4" />, id: "home" },
    { name: "Pricing", icon: <CreditCard className="h-4 w-4" />, id: "pricing" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;

      setIsUserScrolling(true);

      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }

      if (scrollingTimer.current) {
        clearTimeout(scrollingTimer.current);
        scrollingTimer.current = null;
      }

      if (scrollingDown && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      scrollingTimer.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 100);

      inactivityTimer.current = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (scrollingTimer.current) clearTimeout(scrollingTimer.current);
    };
  }, []);

  const handleSectionClick = (sectionId: "home" | "features" | "pricing") => {
    onSectionChange(sectionId);
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }, 50);
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
        "transition-all duration-500 ease-out",
        isVisible && !isUserScrolling
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-12 opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-white/95 backdrop-blur-lg border border-gray-200/50 rounded-full shadow-2xl px-3 py-2">
        <div className="flex items-center space-x-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              data-lov-id={section.id}
              className="flex items-center"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSectionClick(section.id as "home" | "features" | "pricing")}
                className={cn(
                  "rounded-full transition-all duration-300 ease-out",
                  "h-10 px-4 flex items-center justify-center gap-2",
                  "hover:scale-105 active:scale-95",
                  currentSection === section.id
                    ? "bg-black text-white shadow-lg hover:bg-black hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                )}
              >
                {section.icon}
                <span className="hidden sm:inline text-sm font-medium">
                  {section.name}
                </span>
              </Button>

              {/* Separator */}
              {index < sections.length - 1 && (
                <div className="w-2px h-4 bg-gray-300 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
