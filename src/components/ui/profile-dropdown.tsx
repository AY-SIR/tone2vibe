import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  BarChart3, 
  History, 
  CreditCard, 
  LogOut,
  Settings
} from 'lucide-react';
import { useRealTimeWordCount } from '@/hooks/useRealTimeWordCount';

export function ProfileDropdown() {
  const { user, profile, signOut } = useAuth();
  const { realTimeWordsUsed, realTimePurchasedWords } = useRealTimeWordCount();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !profile) return null;

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Use real-time values when available
  const planWordsUsed = realTimeWordsUsed || profile.plan_words_used || 0;
  const planLimit = profile.words_limit || 0;
  const purchasedWords = realTimePurchasedWords || profile.word_balance || 0;
  const planWordsRemaining = Math.max(0, planLimit - planWordsUsed);
  const totalAvailable = planWordsRemaining + purchasedWords;
  const wordsPercentage = planLimit > 0 ? (planWordsUsed / planLimit) * 100 : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-black text-white">
              {getInitials(profile.full_name || user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {profile.full_name || 'User'}
              </p>
              <Badge variant={profile.plan === 'free' ? 'secondary' : 'default'}>
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-xs">
                <span>Plan Words:</span>
                <span className={planWordsRemaining < 100 ? 'text-red-600' : 'text-gray-600'}>
                  {planWordsUsed.toLocaleString()}/{planLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${
                    wordsPercentage > 90 ? 'bg-red-500' : 
                    wordsPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(wordsPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Purchased:</span>
                <span className="text-blue-600 font-medium">
                  {purchasedWords > 0 ? purchasedWords.toLocaleString() : "0"}
                </span>
              </div>
              
              <div className="flex justify-between text-xs">
  <span className="text-muted-foreground">Total available:</span>
  <span className="text-gray-800 font-medium">
    {totalAvailable.toLocaleString()}
  </span>
</div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

         <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Profile Settings</span>
        </DropdownMenuItem>

         <DropdownMenuItem onClick={() => navigate('/payment')} className="cursor-pointer">
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Subscription Plans</span>
        </DropdownMenuItem>


        
        <DropdownMenuItem onClick={() => navigate('/history')} className="cursor-pointer">
          <History className="mr-2 h-4 w-4" />
          <span>Voice History</span>
        </DropdownMenuItem>
        

         <DropdownMenuItem onClick={() => navigate('/analytics')} className="cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Analytics</span>
        </DropdownMenuItem>

        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="cursor-pointer text-red-600 focus:text-red-600"
          disabled={isLoading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
