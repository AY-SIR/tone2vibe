
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTimeWordCount } from '@/hooks/useRealTimeWordCount';

export function MobileWordCounter() {
  const { profile } = useAuth();
  const { realTimeWordsUsed, realTimePurchasedWords } = useRealTimeWordCount();
  const [showFull, setShowFull] = useState(false);

  if (!profile) return null;

  // Use real-time values when available, fallback to profile
  const planWordsUsed = realTimeWordsUsed || profile.plan_words_used || 0;
  const planWordsLimit = profile.words_limit || 0;
  const purchasedWords = realTimePurchasedWords || profile.word_balance || 0;
  const planWordsRemaining = Math.max(0, planWordsLimit - planWordsUsed);
  const totalAvailable = planWordsRemaining + purchasedWords;

  const formatWords = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowFull(!showFull)}
      className="text-xs sm:text-sm"
      title={`Plan: ${formatWords(planWordsUsed)}/${formatWords(planWordsLimit)} | Available: ${formatWords(totalAvailable)}${purchasedWords > 0 ? ` (${formatWords(purchasedWords)} purchased)` : ''}`}
    >
      {showFull ? (
        <span>{totalAvailable.toLocaleString()} words </span>
      ) : (
        <span>{formatWords(totalAvailable)} left</span>
      )}
    </Button>
  );
}
