import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, Check, X } from "lucide-react";
import { CouponService, type CouponValidation } from "@/services/couponService";

interface CouponInputProps {
  amount: number;
  type: 'subscription' | 'words';
  onCouponApplied: (validation: CouponValidation) => void;
  disabled?: boolean;
}

export function CouponInput({ amount, type, onCouponApplied, disabled = false }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CouponValidation | null>(null);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidating(true);
    try {
      const result = await CouponService.validateCoupon(couponCode.trim(), amount, type);
      setValidationResult(result);
      onCouponApplied({
        ...result,
        code: couponCode.trim()
      });
    } catch (error) {
      const errorResult: CouponValidation = {
        isValid: false,
        discount: 0,
        message: 'Error validating coupon',
        code: couponCode.trim()
      };
      setValidationResult(errorResult);
      onCouponApplied(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode('');
    setValidationResult(null);
    onCouponApplied({
      isValid: false,
      discount: 0,
      message: '',
      code: ''
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateCoupon();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Have a coupon code?</span>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isValidating || validationResult?.isValid}
            className="text-sm"
          />
        </div>
        
        {validationResult?.isValid ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCoupon}
            disabled={disabled}
            className="px-3"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={validateCoupon}
            disabled={disabled || isValidating || !couponCode.trim()}
            className="px-3"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className="flex items-center gap-2">
          {validationResult.isValid ? (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              {validationResult.message}
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              <X className="h-3 w-3 mr-1" />
              {validationResult.message}
            </Badge>
          )}
        </div>
      )}

      {/* Discount Preview */}
      {validationResult?.isValid && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-700">Original Amount:</span>
            <span className="text-green-700">₹{amount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-700">Discount:</span>
            <span className="text-green-700">-₹{validationResult.discount}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium border-t border-green-200 pt-2 mt-2">
            <span className="text-green-800">Final Amount:</span>
            <span className="text-green-800">₹{Math.max(0, amount - validationResult.discount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}