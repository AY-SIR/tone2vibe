// components/payment/couponInput.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Tag, CheckCircle2, XCircle } from "lucide-react";
import { CouponService, type CouponValidation } from "@/services/couponService";

interface CouponInputProps {
  amount: number;
  type: "subscription" | "words";
  onCouponApplied: (validation: CouponValidation) => void;
  disabled?: boolean;
}

export function CouponInput({ amount, type, onCouponApplied, disabled }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<CouponValidation>({
    isValid: false,
    discount: 0,
    message: "",
    code: "",
  });

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      const invalid = {
        isValid: false,
        discount: 0,
        message: "Please enter a coupon code",
        code: "",
      };
      setValidation(invalid);
      onCouponApplied(invalid);
      return;
    }

    setLoading(true);

    try {
      const result = await CouponService.validateCoupon(code, amount, type);
      setValidation(result);
      onCouponApplied(result);
    } catch (error) {
      const err = {
        isValid: false,
        discount: 0,
        message: "Error validating coupon. Please try again.",
        code: "",
      };
      setValidation(err);
      onCouponApplied(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    const reset = {
      isValid: false,
      discount: 0,
      message: "",
      code: "",
    };
    setValidation(reset);
    onCouponApplied(reset);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="coupon-code" className="text-xs sm:text-sm flex items-center gap-2">
          <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
          Have a Coupon Code?
        </Label>

        <div className="flex gap-2">
          <Input
            id="coupon-code"
            type="text"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)} // no .toUpperCase()
            disabled={disabled || loading || validation.isValid}
            className="text-sm" // removed uppercase
            onKeyDown={(e) => {
              if (e.key === "Enter" && !validation.isValid) {
                e.preventDefault();
                handleApplyCoupon();
              }
            }}
          />

          {!validation.isValid ? (
            <Button
              type="button"
              onClick={handleApplyCoupon}
              disabled={disabled || loading || !couponCode.trim()}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "Apply"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleRemoveCoupon}
              disabled={disabled}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {validation.message && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-xs sm:text-sm ${
            validation.isValid
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {validation.isValid ? (
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <p className="font-medium">{validation.message}</p>
            {validation.isValid && validation.discount > 0 && (
              <p className="text-xs mt-1 opacity-90">
                Code: <span className="font-mono font-bold">{validation.code}</span>
                {validation.discountType === "percentage"
                  ? ` (${Math.round((validation.discount / (validation.originalAmount || amount)) * 100)}% off)`
                  : " (Fixed discount)"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
