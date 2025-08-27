
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    // Simulate newsletter subscription
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      toast({
        title: "Successfully subscribed!",
        description: "You'll receive updates about new features and improvements.",
      });
    }, 1000);
  };

  if (isSubscribed) {
    return (
      <section className="py-16 ">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Thank you for subscribing!
          </h2>
          <p className="text-gray-600">
            We'll keep you updated with the latest features and improvements.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 ">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Mail className="h-12 w-12 text-black" />
          </div>
                     <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">

            Stay in the Loop
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Get the latest updates on new features, improvements, and tips for creating amazing voice content.
          </p>
          
          <Card className="max-w-md mx-auto border-gray-200 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleSubscribe} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
                <Button 
                  type="submit" 
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Subscribing..." : "Subscribe to Newsletter"}
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-3">
                No spam, unsubscribe anytime. Privacy policy applies.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
