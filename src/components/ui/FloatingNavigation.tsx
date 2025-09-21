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
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sections = [
    { name: "Features", icon: <FileText />, id: "features" },
    { name: "Home", icon: <Home />, id: "home" },
    { name: "Pricing", icon: <CreditCard />, id: "pricing" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShow(false);
      } else {
        setShow(true);
      }

      lastScrollY.current = currentScrollY;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = (id: "home" | "features" | "pricing") => {
    onSectionChange(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300",
        show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-full px-2 py-2 shadow-2xl flex items-center space-x-2 sm:space-x-0">
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center">
             <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClick(section.id as "home" | "features" | "pricing")}
              className={cn(
                "rounded-full h-10 w-20 sm:w-28 flex items-center justify-center sm:justify-start px-0 sm:px-4 transition-colors duration-300",
                currentSection === section.id
                  // --- FIX: Added explicit hover styles to the active button ---
                  ? "bg-black text-white shadow-lg hover:bg-black hover:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              )}
            >
              {/* No changes needed for the icon, its styling was correct */}
              {React.cloneElement(section.icon, {
                className: cn(
                  "h-5 w-5 transition-colors duration-300",
                  currentSection === section.id
                    ? "text-white"
                    : "text-gray-600 group-hover:text-black" // Using group-hover for icon color change
                ),
              })}
              <span className="hidden sm:inline ml-2">{section.name}</span>
            </Button>

            {index < sections.length - 1 && (
              <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
