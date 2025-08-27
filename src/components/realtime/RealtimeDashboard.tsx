
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, Zap } from 'lucide-react';
import { ProcessingQueue } from './ProcessingQueue';
import { VoiceProcessingStatus } from './VoiceProcessingStatus';
import { WebSocketStatus } from './WebSocketStatus';
import { useRealtimeProfile } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';

export const RealtimeDashboard = () => {
  const { profile } = useAuth();
  useRealtimeProfile(); // Enable real-time profile updates

  const stats = [
    {
      title: 'Words Used',
      value: profile?.plan_words_used || 0, // Use plan_words_used
      total: profile?.words_limit || 1000,
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      title: 'Current Plan',
      value: profile?.plan || 'free',
      icon: Zap,
      color: 'text-green-600'
    },
    {
      title: 'Storage Used',
      value: `${profile?.upload_limit_mb || 5}MB`,
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  const wordsPercentage = profile ? (profile.plan_words_used / profile.words_limit) * 100 : 0; // Use plan_words_used

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                    {stat.total && (
                      <p className="text-sm text-gray-500 ml-2">
                        / {stat.total.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {stat.total && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(wordsPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real-time Components */}
      <Tabs defaultValue="processing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="processing">Processing Queue</TabsTrigger>
          <TabsTrigger value="voice">Voice Status</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket Status</TabsTrigger>
        </TabsList>

        <TabsContent value="processing">
          <ProcessingQueue />
        </TabsContent>

        <TabsContent value="voice">
          <VoiceProcessingStatus />
        </TabsContent>

        <TabsContent value="websocket">
          <WebSocketStatus endpoint="realtime-updates" autoConnect={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
