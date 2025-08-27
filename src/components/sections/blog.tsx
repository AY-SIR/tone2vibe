import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Blog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 hover:bg-gray-50"
          >
            <span> Back to Home</span>
          </Button>
        </div>
      </header>

      {/* Main Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900">
            Blog & Insights
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-medium">
          No articles published yet. Stay tuned!
        </p>
        </div>
      </div>
    </div>
  );
};

export default Blog;
