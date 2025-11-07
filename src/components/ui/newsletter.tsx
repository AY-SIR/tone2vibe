import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert([{ email }]);

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
    } catch (error) {
      // Silent error handling
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen py-16 px-4 bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="animate-fade-in">
          <Mail className="h-12 w-12 text-black mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-black">Stay Updated</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Get the latest updates on new features, voice cloning technology, and exclusive offers.
          </p>
        </div>

        <Card className="max-w-md mx-auto bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg animate-slide-up">
          <CardContent className="p-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-center border-gray-300 focus:border-black"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 transform hover:scale-105 transition-all duration-200"
                  disabled={!email || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    "Subscribe to Newsletter"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-3">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-green-600 font-semibold">Thank you for subscribing!</p>
                <p className="text-sm text-gray-600">You'll receive updates soon.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
