import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, TrendingUp, Crown, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { AnalyticsService, type ProAnalytics, type PremiumAnalytics } from "@/services/analyticsService";
import { useToast } from "@/hooks/use-toast";

const RealAnalytics = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Redirect if not authenticated or doesn't have analytics access
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (profile?.plan === 'free') {
      navigate('/payment');
      return;
    }
  }, [user, profile, navigate]);

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['real-analytics', user?.id, profile?.plan],
    queryFn: async () => {
      if (!user || profile?.plan === 'free') return null;

      console.log('Fetching analytics for user:', user.id, 'plan:', profile?.plan);
      const result = await AnalyticsService.getUserAnalytics(user.id, profile?.plan);
      console.log('Analytics result:', result);
      return result;
    },
    enabled: !!user && profile?.plan !== 'free',
    refetchInterval: 30000,
    retry: 3
  });

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: "Error loading data",
        description: "Unable to load analytics",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (!user || profile?.plan === 'free') {
    return null;
  }

  const isPro = profile?.plan === 'pro';
  const isPremium = profile?.plan === 'premium';
  const premiumAnalytics = analytics as PremiumAnalytics;

  return (
    <div className="min-h-screen bg-white animate-fade-in">


    <div className="flex justify-end w-full">
  <Badge className={`${isPremium ? "bg-black" : "bg-gray-600"} text-white`}>
    {isPremium ? "Premium" : "Pro"} Analytics
  </Badge>
</div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex items-center justify-center py-20">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
                <p className="text-gray-600 mb-4">
                  Unable to load analytics data
                </p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Main Analytics UI */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${isPremium ? 'grid-cols-4' : 'grid-cols-3'} max-w-md`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              {isPremium && <TabsTrigger value="insights">Insights</TabsTrigger>}
            </TabsList>

            {/* --- Overview Tab --- */}
            <TabsContent value="overview" className="space-y-6 animate-scale-in">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-black mb-1">
                      {analytics?.totalProjects || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Projects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-black mb-1">
                      {((analytics?.totalWordsProcessed || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Words</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-600 mb-1">
                      {((analytics?.wordsRemaining || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Remaining</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-black mb-1">
                      {analytics?.languageUsage?.length || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Languages</div>
                  </CardContent>
                </Card>
              </div>

              {/* Premium Metrics */}
              {isPremium && premiumAnalytics.performanceInsights && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border-black">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-black" />
                        <span>Efficiency</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-black mb-1">
                        {premiumAnalytics.performanceInsights.efficiencyScore}%
                      </div>
                      <p className="text-xs text-gray-600">Performance</p>
                    </CardContent>
                  </Card>
                  <Card className="border-black">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Processing</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-black mb-1">
                        {(premiumAnalytics.performanceInsights.avgProcessingTime / 1000).toFixed(1)}s
                      </div>
                      <p className="text-xs text-gray-600">Avg time</p>
                    </CardContent>
                  </Card>
                  <Card className="border-black">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Peak Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {premiumAnalytics.performanceInsights.peakUsageHours?.[0] || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-600">Top usage</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* --- Usage Tab --- */}
            <TabsContent value="usage" className="space-y-6 animate-scale-in">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                  <CardDescription>Your latest usage patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{activity.date}</div>
                            <div className="text-sm text-gray-600">
                              {activity.projects} project{activity.projects !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{activity.words.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">words</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No recent activity found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Charts Tab --- */}
            <TabsContent value="charts" className="space-y-6 animate-scale-in">
              {analytics?.languageUsage && analytics.languageUsage.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Language Distribution</CardTitle>
                    <CardDescription>Usage breakdown by language</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.languageUsage}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#000000"
                            dataKey="count"
                            label={({ language, percentage }) => `${language} (${percentage}%)`}
                          >
                            {analytics.languageUsage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, ${index % 2 === 0 ? '40%' : '60%'})`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isPremium && premiumAnalytics.weeklyTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Trends</CardTitle>
                    <CardDescription>Words and projects over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={premiumAnalytics.weeklyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="words" fill="#000000" name="Words" />
                          <Bar dataKey="projects" fill="#666666" name="Projects" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* --- Insights Tab (Premium only) --- */}
            {isPremium && (
              <TabsContent value="insights" className="space-y-6 animate-scale-in">
                <Card className="border-black">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Crown className="h-5 w-5 text-black" />
                      <span className="text-base sm:text-lg">Premium Insights</span>
                      <Badge className="bg-black text-white">Premium</Badge>
                    </CardTitle>
                    <CardDescription className="mt-4">Advanced analysis of your usage patterns</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black mb-2">Peak Usage Hours</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Your most active hours: {premiumAnalytics.performanceInsights?.peakUsageHours?.join(', ') || 'No data available'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black mb-2">Efficiency Analysis</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Your current efficiency score is {premiumAnalytics.performanceInsights?.efficiencyScore || 0}%
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black mb-2">Processing Performance</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Average processing time: {premiumAnalytics.performanceInsights ? 
                        (premiumAnalytics.performanceInsights.avgProcessingTime / 1000).toFixed(1) : 0}s
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default RealAnalytics;
