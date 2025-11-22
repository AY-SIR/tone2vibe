import { useEffect, useState } from "react";
import { Wrench, RefreshCw, Mail } from "lucide-react";

export default function Maintenance() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">


      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full text-center space-y-8 sm:space-y-12">
        <div className="max-w-7xl mx-auto flex justify-center">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
 <img
    src="/favicon.png"
    alt="icon"
    className="w-7 h-7 "
  />               </div>
    <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
      Tone2Vibe
    </h2>
  </div>
</div>

          {/* Icon and Title on Same Line */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-black tracking-tight">
              Under Maintenance
            </h1>
          </div>
           <div className="flex items-center justify-center gap-2 text-black/60">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            <a
              href="mailto:support@tone2vibe.in"
              className="text-sm sm:text-base font-light hover:text-black transition-colors duration-300"
            >
              support@tone2vibe.in
            </a>
          </div>

          {/* Message */}
          <p className="text-base sm:text-lg md:text-xl text-black/60 font-light">
            We're upgrading our systems{dots}
          </p>


          {/* Button */}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-12 py-3 sm:py-4 bg-black text-white hover:bg-black/90 font-light text-sm sm:text-base tracking-wide uppercase transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            Refresh
          </button>
        </div>



      </main>




    </div>
  );
}