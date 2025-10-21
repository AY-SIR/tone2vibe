import { CompareDemo } from "@/components/CompareDemo";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GridConnect from "@/components/gridconnect";
import { Marque2 } from "@/components/marque2"
import { WordsFlip } from "@/components/wordsflip"

import { FloatingNavigation } from "@/components/ui/FloatingNavigation";
import { MobileWordCounter } from "@/components/layout/MobileWordCounter";
import Animated from "@/components/layout/animated"

import {
  Mic,
  Zap,
  Shield,
  FileText,
  Languages,
  Volume2,
  Settings,
  Download,
  History,
  ArrowRight,
  Check,
  Play,
  Cookie,
  LogIn,
} from "lucide-react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { VideoModal } from "@/components/common/VideoModal";
import { WorkflowSection } from "@/components/sections/WorkflowSection";
import { NewsletterSection } from "@/components/sections/NewsletterSection";
import { CookieConsent } from "@/components/common/CookieConsent";
import { WelcomePopup } from "@/components/common/WelcomePopup";
import { LocationService } from "@/services/locationService";

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();


  const [showAuthModal, setShowAuthModal] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(
    localStorage.getItem("cookie-consent")
  );
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCookieAlert, setShowCookieAlert] = useState(false);
  const [currentSection, setCurrentSection] = useState<"home" | "features" | "pricing">("home");
  const [pricing, setPricing] = useState({
    currency: "INR",
    symbol: "₹",
    plans: {
      pro: { price: 151, originalPrice: 151 },
      premium: { price: 299, originalPrice: 299 },
    },
  });

  // Load pricing based on country
  const loadPricing = async () => {
    try {
      const savedCountry = localStorage.getItem("user-country");
      if (!savedCountry) {
        const locationData = await LocationService.detectUserLocation();
        const country = locationData?.country || "Unknown";
        localStorage.setItem("user-country", country);
      }
      const userPricing = LocationService.getPricing();
      setPricing(userPricing);
    } catch (error) {
      console.error("Failed to load pricing:", error);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  // Features array
  const features = [
    { icon: <FileText className="h-6 w-6" />, title: "Multiple Input Types", description: "Upload text, PDF, or images—AI extracts content instantly." },
    { icon: <Mic className="h-6 w-6" />, title: "Advanced Voice Cloning", description: "Clone your voice with studio-quality accuracy." },
    { icon: <Languages className="h-6 w-6" />, title: "50+ Languages", description: "Convert text to speech in over 50 languages." },
    { icon: <Volume2 className="h-6 w-6" />, title: "Natural Speech", description: "Generate lifelike audio with emotional depth." },
    { icon: <Settings className="h-6 w-6" />, title: "Advanced Controls", description: "Control pitch, speed, and emotion in speech." },
    { icon: <Shield className="h-6 w-6" />, title: "Privacy & Security", description: "Your voice data is encrypted and never misused." },
    { icon: <Download className="h-6 w-6" />, title: "Export Options", description: "Download audio in MP3, WAV, and more formats." },
    { icon: <History className="h-6 w-6" />, title: "Project History", description: "Access past projects with full metadata." },
    { icon: <Zap className="h-6 w-6" />, title: "Lightning Fast", description: "Get results instantly with AI-powered speed." },
  ];

  // Pricing plans array
  const pricingPlans = [
    {
      name: "Free",
      price: `${pricing.symbol}0`,
      period: "/month",
      description: "Perfect for trying out voice cloning",
      features: ["1,000 words/month","10MB upload limit","Basic voice quality","7 Days History","Last 3 voices in History","Email support"],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: `${pricing.symbol}${pricing.plans.pro.price}`,
      period: "/month",
      description: "Best for content creators and professionals",
      features: [
        "10,000 words/month","25MB upload limit","High quality audio","Last 30 voice history",
        "30 Days History","Voice storage & reuse","Priority support","Speed & pitch control","Usage analytics & charts",
        `Buy extra words (${pricing.symbol}11 per 1000 words)`,
        "Max total: 46,000 words"
      ],
      cta: "Upgrade",
      popular: true,
    },
    {
      name: "Premium",
      price: `${pricing.symbol}${pricing.plans.premium.price}`,
      period: "/month",
      description: "For teams and heavy users",
      features: [
        "50,000 words/month","100MB upload limit","Ultra-high quality","Last 90 voice history",
        "90 Days History","Voice storage & reuse","Advanced Speed & pitch control","Advanced analytics",
        "24/7 priority support",
        `Buy extra words (${pricing.symbol}9 per 1000 words)`,
        "Max total: 99,000 words"
      ],
      cta: "Upgrade",
      popular: false,
    },
  ];

  // Handle URL parameters for auth modal
  useEffect(() => {
    const authParam = searchParams.get('auth');
    const redirectParam = searchParams.get('redirect');
    const fromProtected = searchParams.get('from_protected');

    if (authParam === 'open') {
      const consentStatus = localStorage.getItem("cookie-consent");
      if (consentStatus === "declined") {
        setShowCookieAlert(true);
        if (redirectParam) setRedirectTo(decodeURIComponent(redirectParam));
      } else {
        setShowAuthModal(true);
        if (redirectParam) setRedirectTo(decodeURIComponent(redirectParam));
      }
      
      // Don't show welcome popup if coming from protected route
      if (fromProtected === 'true') {
        localStorage.setItem("hasSeenWelcome", "true");
      }
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    const consentStatus = localStorage.getItem("cookie-consent");
    if (consentStatus === "declined") {
      setShowCookieAlert(true);
      return;
    }
    if (user) navigate("/tool");
    else setShowAuthModal(true);
  };

  const handlePlanClick = (planName: string) => {
    const consentStatus = localStorage.getItem("cookie-consent");
    if (planName === "Free") return handleGetStarted();
    if (user) navigate("/payment");
    else {
      if (consentStatus === "declined") {
        setRedirectTo("/payment");
        setShowCookieAlert(true);
        return;
      }
      setRedirectTo("/payment");
      setShowAuthModal(true);
    }
  };

  // Handle auth modal state changes
  const handleAuthModalChange = (open: boolean) => {
    setShowAuthModal(open);
    if (!open) {
      // Clear URL parameters when modal is closed
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('auth');
      newSearchParams.delete('view');
      newSearchParams.delete('redirect');
      setSearchParams(newSearchParams, { replace: true });
      setRedirectTo(null);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    const finalRedirectTo = redirectTo || "/tool";

    // Clear auth modal and redirect
    setShowAuthModal(false);
    setRedirectTo(null);

    // Clear URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('auth');
    newSearchParams.delete('view');
    newSearchParams.delete('redirect');
    setSearchParams(newSearchParams, { replace: true });

    // Navigate to intended destination
    navigate(finalRedirectTo, { replace: true });
  };

  const handleCookieAccept = () => {
    setCookieConsent("accepted");
    localStorage.setItem("cookie-consent", "accepted");
    setShowCookieAlert(false);
    if (redirectTo) setShowAuthModal(true);
  };

  const handleCookieDecline = () => {
    setCookieConsent("declined");
    localStorage.setItem("cookie-consent", "declined");
    setShowCookieAlert(false);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
    if (!localStorage.getItem("cookie-consent")) setCookieConsent(null);
  };

  const handleWelcomeGetStarted = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
    handleGetStarted();
  };

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    const authParam = searchParams.get('auth');
    const fromProtected = searchParams.get('from_protected');
    
    // Don't show welcome popup if:
    // 1. User is logged in
    // 2. User has already seen welcome
    // 3. Auth modal is being opened (from protected route redirect)
    // 4. Coming from protected route
    if (!hasSeenWelcome && !user && authParam !== 'open' && fromProtected !== 'true') {
      setTimeout(() => setShowWelcome(true), 1000);
    }
  }, [user, searchParams]);

  // Section change handler with scroll to top
  const handleSectionChange = (section: "home" | "features" | "pricing") => {
    setCurrentSection(section);
    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render content based on current section
  const renderContent = () => {
    switch (currentSection) {
      case "home":
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-6 pb-8 sm:pt-10 sm:pb-12 px-4 text-center overflow-hidden mt-16 flex items-center">
        <div className="relative z-10 container mx-auto max-w-4xl">
          {/* Hero Content */}
          <div className="animate-fade-in">
            <Badge className="mb-6 bg-gray-400 text-white hover:bg-gray-400 mt-2">
              ✨ Now with 50+ language support
            </Badge>
<WordsFlip />
            <div className="mt-8">
             <Marque2 />
             </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-bold animate-scale-in"
                onClick={handleGetStarted}
              >
                {user ? "Go to Tool" : "Start Cloning Now"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 hover:bg-gray-100 text-black px-8 py-4 text-lg animate-scale-in"
                onClick={() => setShowVideoModal(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
          </div>
        </div>


      </section>

      {/* Animated Beams AFTER Hero */}
      <div className="w-full  overflow-hidden">
        <Animated />
      </div>
      {/* Divider */}
      <div className="flex items-center my-8">
        <div className="flex-grow border-t border-gray-300"></div>
        <Mic className="mx-3 h-5 w-5 text-gray-900" />
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
      <div className=" flex items-center justify-center p-8">
      <CompareDemo />
    </div>
    </>
  );





      case "features":
        return (
          <section className="relative py-28 px-6 bg-white text-black min-h-screen">
            <div className="container mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  Our Key Features
                </h2>
                <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                  Minimal. Bold. Powerful. Everything you need, nothing you don't.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group relative cursor-pointer p-8 border border-gray-200 rounded-2xl bg-white hover:shadow-xl transition-all duration-500"
                  >
                    <div className="w-14 h-14 flex items-center justify-center rounded-xl text-black mb-6 transition-colors duration-500">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-black">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-black group-hover:w-full transition-all duration-500"></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center my-8">
        <div className="flex-grow border-t border-gray-300"></div>
        <Mic className="mx-3 h-5 w-5 text-gray-900" />
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
              <div className="mt-24">
                <WorkflowSection />
              </div>
            </div>
          </section>
        );
      case "pricing":
        return (
          <section className="py-28 px-4 ">
            <div className="container mx-auto">
              <div className="text-center mb-16 animate-fade-in">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  Popular Plans
                </h2>
                <p className="text-gray-600 text-xl max-w-2xl mx-auto mt-4">
                  Choose the perfect plan for your voice cloning needs
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {pricingPlans.map((plan, index) => (
                  <Card
                    key={index}
                    className={`relative hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up ${
                      plan.popular ? "ring-2 ring-black shadow-lg" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-black text-white">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-8">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold mb-2 text-black">
                          {plan.name}
                        </h3>
                        <p className="text-gray-600 mb-4">{plan.description}</p>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold text-black">
                            {plan.price}
                          </span>
                          <span className="text-gray-600">{plan.period}</span>
                        </div>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-center space-x-3"
                          >
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          plan.popular
                            ? "bg-black hover:bg-gray-800 text-white"
                            : "bg-white hover:bg-gray-100 text-black border border-gray-300"
                        }`}
                        onClick={() => handlePlanClick(plan.name)}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative  min-h-screen bg-white font-modern overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-2 left-6 right-6 z-50 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md shadow-lg transition-transform duration-300">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => handleSectionChange("home")}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
              <Mic className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent">
              Tone2Vibe
            </span>
          </button>
          <div className="flex items-center space-x-4">
{user && profile?.plan && (
              <>
                <div className="hidden min-[400px]:inline-block text-xs capitalize">
                  <MobileWordCounter />
                </div>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-block text-xs capitalize"
                >
                  {profile.plan}
                </Badge>
              </>
            )}
            {user ? (
              <ProfileDropdown />
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-gray-100/70 hover:bg-gray-200/80 text-black flex items-center gap-2 rounded-xl"
              >
                Sign In
                <LogIn className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {renderContent()}
      </main>

      {/* Divider */}
      <div className="flex items-center my-10">
        <div className="flex-grow border-t border-gray-300"></div>
        <Mic className="mx-3 h-5 w-5 text-gray-900" />
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <button
                onClick={() => handleSectionChange("home")}
                className="flex items-center space-x-2 mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Mic className="h-5 w-5 text-black" />
                </div>
                <span className="text-xl font-bold text-black">
                  Tone2Vibe
                </span>
              </button>
              <p className="text-gray-600">
               "Transform words into moods"
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-black">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <button
                    onClick={() => handleSectionChange("features")}
                    className="hover:text-black transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleSectionChange("pricing")}
                    className="hover:text-black transition-colors"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-black">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link to="/blog" className="hover:text-black transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-black transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookies"
                    className="hover:text-black transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-black">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-black transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-black transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8">
            <GridConnect />
            <div className="flex items-center my-10">
              <div className="flex-grow border-t border-gray-300"></div>
              <Mic className="mx-3 h-5 w-5 text-gray-900" />
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <div className="text-center text-gray-600 mt-4">
              <p>&copy; 2025 Tone2Vibe. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>


      {/* Floating Navigation */}
      <FloatingNavigation
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />

      {/* Modals */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={handleAuthModalChange}
      />
      <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />

      {showWelcome && !user && (
        <WelcomePopup
          onGetStarted={handleWelcomeGetStarted}
          onClose={handleWelcomeClose}
        />
      )}

      {!showWelcome && !cookieConsent && !user && (
        <CookieConsent
          onAccept={handleCookieAccept}
          onDecline={handleCookieDecline}
        />
      )}

      {showCookieAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <Cookie className="h-5 w-5 text-gray-900" />
              <h3 className="text-lg font-semibold">Cookies Required</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have declined cookies. Please accept cookies to use login and
              other features of Tone2Vibe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCookieAccept}
                className="flex-1 bg-gray-900 hover:bg-gray-700"
              >
                Accept Cookies & Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCookieAlert(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
