import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { User, Mail, MapPin, Building, Crown, Save, ArrowLeft, Calendar, Zap, Clock, Shield, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, profile, updateProfile, loading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    company: profile?.company || '',
    country: profile?.country || '',
    preferred_language: profile?.preferred_language || 'en-US'
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://msbmyiqhohtjdfbjmxlf.supabase.co/functions/v1/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      });
      
      navigate('/');
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Could not delete account. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    if (formData.email) {
      return formData.email[0].toUpperCase();
    }
    return 'U';
  };

  const getPlanDetails = () => {
    const plan = profile?.plan || 'free';
    switch (plan) {
      case 'premium':
        return {
          name: 'Premium',
          color: 'from-purple-600 to-pink-600',
          bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
          textColor: 'text-purple-700',
          icon: <Crown className="h-5 w-5" />,
          features: ['50,000 words/month', 'Premium AI voices', '90-day history', 'Priority support', 'Advanced analytics'],
          description: 'Everything you need for professional voice synthesis'
        };
      case 'pro':
        return {
          name: 'Pro',
          color: 'from-blue-600 to-indigo-600',
          bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          textColor: 'text-blue-700',
          icon: <Zap className="h-5 w-5" />,
          features: ['10,000 words/month', 'Advanced voices', '30-day history', 'Email support', 'Custom voices'],
          description: 'Perfect for content creators and businesses'
        };
      default:
        return {
          name: 'Free',
          color: 'from-gray-600 to-gray-700',
          bgColor: 'bg-gradient-to-r from-gray-50 to-gray-100',
          textColor: 'text-gray-700',
          icon: <Shield className="h-5 w-5" />,
          features: ['1,000 words/month', 'Basic voices', '7-day history', 'Community support'],
          description: 'Great for getting started with voice synthesis'
        };
    }
  };

  const planDetails = getPlanDetails();
  const usagePercentage = Math.min((profile?.plan_words_used || 0) / (profile?.words_limit || 1000) * 100, 100); // Use plan_words_used

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 ">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your account, preferences, and subscription
            </p>
          </div>
        </div>

        {/* Mobile-first layout: Profile -> Form -> Plan -> Delete */}
        <div className="space-y-8">
          
          {/* Profile Card - Shows first on mobile */}
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-primary/20 to-secondary/20">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{formData.full_name || 'User'}</h3>
                  <p className="text-muted-foreground text-sm">{formData.email}</p>
                  <Badge 
                    variant="secondary"
                    className={`mt-2 ${planDetails.bgColor} ${planDetails.textColor} border-0`}
                  >
                    {planDetails.icon}
                    <span className="ml-2 font-medium">{planDetails.name}</span>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form - Shows second on mobile, spans wider on desktop */}
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <p className="text-muted-foreground">
                Update your personal details and preferences
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="full_name"
                        placeholder="Enter your full name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="pl-10 border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        readOnly
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      Company
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="company"
                        placeholder="Company name (optional)"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="pl-10 border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium">
                      Country
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="country"
                        realOnly
                        placeholder="Your country"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="pl-10 border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Language */}
                <div className="space-y-2">
                  <Label htmlFor="preferred_language" className="text-sm font-medium">
                    Preferred Language
                  </Label>
                  <Select
                    value={formData.preferred_language}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_language: value }))}
                  >
                    <SelectTrigger className="border-muted-foreground/20 focus:border-primary">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                       </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    disabled={isUpdating}
                    size="lg"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating Profile...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Plan Details Card - Shows third on mobile */}
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                {planDetails.icon}
                <span>{planDetails.name} Plan</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{planDetails.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Usage Stats */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Words Used</span>
                  <span className="font-medium">{profile?.plan_words_used || 0} / {profile?.words_limit || 1000}</span>
                </div>
                
                <Progress 
                  value={usagePercentage} 
                  className="h-2"
                />
                
                <div className="text-xs text-muted-foreground text-center">
                  {(100 - usagePercentage).toFixed(1)}% remaining this month
                </div>
              </div>

              <Separator />

              {/* Additional Info - Only show purchased words if user has any */}
              <div className="space-y-3">
                {(profile?.word_balance || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchased Words</span>
                    <span className="font-medium text-blue-600">{profile.word_balance.toLocaleString()} (never expire)</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground font-medium">Total Available</span>
                  <span className="font-bold text-green-600">
                    {Math.max(0, (profile?.words_limit || 0) - (profile?.plan_words_used || 0) + (profile?.word_balance || 0)).toLocaleString()}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground text-center">
                  {profile?.plan === 'free' 
                    ? 'Plan words only • No purchases allowed'
                    : 'Plan words used first, then purchased words'}
                </div>
              </div>

              {/* Plan Dates */}
              {profile?.plan !== 'free' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Plan Started
                    </span>
                    <span className="font-medium">
                      {profile?.plan_start_date
                        ? new Date(profile.plan_start_date).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Expires
                    </span>
                    <span className="font-medium">
                      {profile?.plan_expires_at
                        ? new Date(profile.plan_expires_at).toLocaleDateString()
                        : '30 days from start'
                      }
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Plan Features</h4>
                <ul className="space-y-1">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Action */}
              <Button 
                onClick={() => navigate('/payment')} 
                className={`w-full mt-4 bg-gradient-to-r ${planDetails.color} hover:opacity-90 transition-opacity`}
                variant={profile?.plan === 'free' ? 'default' : 'outline'}
              >
                <Crown className="h-4 w-4 mr-2" />
                {profile?.plan === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Section - Shows last */}
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm border-red-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center space-x-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <p className="text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      This action cannot be undone
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Deleting your account will permanently remove all your data, including:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 ml-4 list-disc">
                      <li>Profile information and preferences</li>
                      <li>Voice history and recordings</li>
                      <li>Subscription and payment data</li>
                      <li>Purchased word credits</li>
                    </ul>
                  </div>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account Permanently
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600">
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including your voice history,
                      subscription, and any purchased word credits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        'Yes, delete my account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
