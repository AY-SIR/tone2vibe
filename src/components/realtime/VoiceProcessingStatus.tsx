
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useRealtimeVoiceProcessing } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';

interface VoiceProcessingStatusProps {
  projectId?: string;
  compact?: boolean;
}

export const VoiceProcessingStatus = ({ projectId, compact = false }: VoiceProcessingStatusProps) => {
  const { status, loading } = useRealtimeVoiceProcessing(projectId);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (status?.estimated_completion) {
      const interval = setInterval(() => {
        const remaining = new Date(status.estimated_completion!).getTime() - Date.now();
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining('Completing...');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status?.estimated_completion]);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'analyzing':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing':
        return <Mic className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'analyzing':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatStageName = (stage: string) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  if (loading) {
    return compact ? (
      <div className="flex items-center space-x-2 text-sm">
        <Loader className="h-4 w-4 animate-spin" />
        <span>Loading status...</span>
      </div>
    ) : (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading processing status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Processing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Mic className="h-8 w-8 mx-auto mb-2" />
            <p>No active voice processing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        {getStageIcon(status.processing_stage)}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{formatStageName(status.processing_stage)}</span>
            <span className="text-sm text-gray-500">{status.progress_percentage}%</span>
          </div>
          <Progress value={status.progress_percentage} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Processing</span>
          </div>
          <Badge variant="secondary" className={getStageColor(status.processing_stage)}>
            {formatStageName(status.processing_stage)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-500">{status.progress_percentage}%</span>
          </div>
          <Progress value={status.progress_percentage} />
        </div>

        {status.status_message && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">{status.status_message}</p>
          </div>
        )}

        {timeRemaining && status.processing_stage !== 'completed' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Estimated time remaining:</span>
            <span className="font-medium">{timeRemaining}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">
          Started {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
};
