import { useEffect, useState } from "react";
import { Wrench, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Maintenance() {
  const [message, setMessage] = useState("We are currently performing scheduled maintenance. Please check back soon.");
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Fetch custom maintenance message
    const fetchMessage = async () => {
      const { data } = await supabase
        .from("maintenance")
        .select("message")
        .single();
      
      if (data?.message) {
        setMessage(data.message);
      }
    };

    fetchMessage();

    // Animated dots
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in duration-1000">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative bg-card border border-border rounded-full p-8 shadow-2xl">
              <Wrench className="w-20 h-20 text-primary animate-bounce" style={{ animationDuration: "3s" }} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Under Maintenance
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {message}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span className="text-lg font-medium">
            We'll be back shortly{dots}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <RefreshCw className="w-5 h-5" />
          Check Again
        </button>

        {/* Footer */}
        <div className="pt-8 text-sm text-muted-foreground">
          <p>Thank you for your patience</p>
        </div>
      </div>
    </div>
  );
}
