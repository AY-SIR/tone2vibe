
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UpgradeButton({ className, children = "Upgrade Plan", ...props }: ButtonProps & { children?: React.ReactNode }) {
  return (
    <Button
      {...props}
      className={cn(
        "w-full bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg shadow-lg transition-all duration-300 border-0",
        className
      )}
    >
      {children}
    </Button>
  );
}
