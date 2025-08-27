import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Coins, CreditCard, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WordPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WordPurchaseModal({ open, onOpenChange }: WordPurchaseModalProps) {
  const [wordCount, setWordCount] = useState([5000]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { profile, locationData } = useAuth();
  const { toast } = useToast();

  const currency = locationData?.currency || 'USD';
  const symbol = currency === 'INR' ? '₹' : '$';
  const pricePerThousand = currency === 'INR' ? 31 : 0.5;
  
  const currentWords = wordCount[0];
  const totalPrice = (currentWords * pricePerThousand) / 1000;

  const handlePurchase = async () => {
    if (!profile || profile.plan === 'free') {
      toast({
        title: "Upgrade Required",
        description: "Word purchases require a Pro or Premium plan.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-words', {
        body: {
          wordCount: currentWords,
          currency: currency
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Word purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Unable to start word purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const presetOptions = [1000, 5000, 10000, 25000, 50000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Purchase Words
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Words Never Expire!</span>
            </div>
            <p className="text-sm text-blue-700">
              Purchased words are added to your permanent balance and won't be lost when your plan expires.
            </p>
          </div>

          {/* Preset Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Select</Label>
            <div className="grid grid-cols-5 gap-2">
              {presetOptions.map((preset) => (
                <Button
                  key={preset}
                  variant={currentWords === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWordCount([preset])}
                  className="text-xs"
                >
                  {preset >= 1000 ? `${preset/1000}k` : preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Slider */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Custom Amount: {currentWords.toLocaleString()} words
            </Label>
            <Slider
              value={wordCount}
              onValueChange={setWordCount}
              min={1000}
              max={100000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1k</span>
              <span>100k</span>
            </div>
          </div>

          {/* Pricing Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                {currentWords.toLocaleString()} words
              </span>
              <span className="text-lg font-bold">
                {symbol}{totalPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Rate: {symbol}{pricePerThousand} per 1,000 words
            </div>
            
            {profile?.plan && (
              <Badge className="mt-2" variant="outline">
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} Plan
              </Badge>
            )}
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing || !profile || profile.plan === 'free'}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Purchase for {symbol}{totalPrice.toFixed(2)}</span>
              </div>
            )}
          </Button>

          {profile?.plan === 'free' && (
            <p className="text-xs text-center text-orange-600">
              Word purchases require a Pro or Premium plan. 
              <Button variant="link" className="text-xs p-0 h-auto ml-1">
                Upgrade first
              </Button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}