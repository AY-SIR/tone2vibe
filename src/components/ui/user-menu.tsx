
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Settings, 
  History, 
  BarChart3, 
  CreditCard, 
  LogOut, 
  ChevronDown,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !profile) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "Successfully logged out",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const planWordsUsed = profile.plan_words_used || 0;
  const planLimit = profile.words_limit || 0;
  // For Pro/Premium users, only show purchased words if they actually bought extra words
  const purchasedWords = (profile.plan !== 'free' && (profile.word_balance || 0) > 0) ? (profile.word_balance || 0) : 0;
  const planWordsRemaining = Math.max(0, planLimit - planWordsUsed);
  const totalAvailable = planWordsRemaining + purchasedWords;
  const wordsUsedPercentage = planLimit > 0 ? (planWordsUsed / planLimit) * 100 : 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full hover:bg-gray-100 p-0"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
              alt={profile.full_name || user.email || 'User'}
            />
            <AvatarFallback>
              {getInitials(profile.full_name || user.email || 'User')}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="absolute -bottom-1 -right-1 h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 p-2 bg-white shadow-xl border border-gray-200" 
        align="end"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-2">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
              alt={profile.full_name || user.email || 'User'}
            />
            <AvatarFallback className="text-lg">
              {getInitials(profile.full_name || user.email || 'User')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {profile.full_name || user.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge 
                className={`text-xs px-2 py-0.5 ${getPlanColor(profile.plan)} capitalize`}
              >
                {profile.plan === 'premium' && <Zap className="h-3 w-3 mr-1" />}
                {profile.plan}
              </Badge>
            </div>
          </div>
        </div>

        {/* Word Usage */}
        <div className="px-3 py-2 mb-2 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Total Available</span>
            <span className="text-blue-600 font-semibold">
              {totalAvailable.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Plan: {planWordsRemaining.toLocaleString()}/{planLimit.toLocaleString()}</span>
            {purchasedWords > 0 && (
              <span className="text-blue-600">Purchased: {purchasedWords.toLocaleString()}</span>
            )}
          </div>
          <div className="mt-2 bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(wordsUsedPercentage, 100)}%` }}
            />
          </div>
          {wordsUsedPercentage > 80 && (
            <p className="text-xs text-orange-600 mt-1">
              {purchasedWords > 0 
                ? "Plan words running low - purchased words never expire" 
                : "Plan words running low - consider purchasing extra words"}
            </p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
        >
          <User className="h-4 w-4" />
          <span>Profile Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/history')}
          className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
        >
          <History className="h-4 w-4" />
          <span>Voice History</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/analytics')}
          className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/payment')}
          className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
        >
          <CreditCard className="h-4 w-4" />
          <span>Billing & Plans</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center space-x-3 px-3 py-2 hover:bg-red-50 cursor-pointer text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
