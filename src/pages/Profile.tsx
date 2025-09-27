import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Mail,
  MapPin,
  Building,
  Crown,
  Save,
  ArrowLeft,
  Zap,
  Shield,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileSkeleton } from "@/components/common/Skeleton";
import { useNavigate } from "react-router-dom";

const Profile: React.FC = () => {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // form data synced from profile/user
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    company: "",
    country: "",
    preferred_language: "en-US",
  });

  // sync form values when profile or user changes
  useEffect(() => {
    setFormData({
      full_name: profile?.full_name || "user",
      email: profile?.email || user?.email || "",
      company: profile?.company || "",
      country: profile?.country || "",
      preferred_language: profile?.preferred_language || "en-US",
    });
  }, [profile, user]);

  // redirect when unauthenticated (after loading finishes)
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  if (loading) {
    return <ProfileSkeleton />;
  }

  // If not loading but user is missing, we already triggered navigate; avoid rendering UI
  if (!user) {
    return null;
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleLanguageChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, preferred_language: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      setIsUpdating(true);
      try {
        await updateProfile({
          full_name: formData.full_name,
          company: formData.company,
          country: formData.country,
          preferred_language: formData.preferred_language,
        });
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
      } catch (err: any) {
        console.error("Profile update error:", err);
        toast({
          title: "Update failed",
          description: err?.message || "Could not update profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [formData, updateProfile, toast, user]
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    if (confirmEmail.trim().toLowerCase() !== user.email?.toLowerCase()) {
      toast({ title: "Email does not match.", variant: "destructive" });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-account");

      if (res?.error) throw res.error;

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      await supabase.auth.signOut();
      setShowDeleteConfirm(false);
      setConfirmEmail("");
      setIsDeleting(false);
      navigate("/");
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  }, [confirmEmail, user, toast, navigate]);

  const getInitials = useCallback(() => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map((n) => n[0] || "")
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    if (formData.email) {
      return formData.email[0].toUpperCase();
    }
    return "U";
  }, [formData.full_name, formData.email]);

  const getPlanDetails = useCallback(() => {
    const plan = profile?.plan || "free";
    switch (plan) {
      case "premium":
        return {
          name: "Premium",
          color: "from-purple-600 to-pink-600",
          textColor: "text-purple-700",
          icon: <Crown className="w-5 h-5" />,
          features: [
            "50,000 words/month",
            "Premium AI voices",
            "90-day history",
            "Advanced analytics & insights",
            "100MB upload limit",
          ],
          description: "Everything you need for professional voice synthesis",
        };
      case "pro":
        return {
          name: "Pro",
          color: "from-blue-600 to-indigo-600",
          textColor: "text-blue-700",
          icon: <Zap className="w-5 h-5" />,
          features: [
            "10,000 words/month",
            "Advanced voices",
            "30-day history",
            "Usage analytics & charts",
            "Custom voices",
          ],
          description: "Perfect for content creators and businesses",
        };
      default:
        return {
          name: "Free",
          color: "from-gray-600 to-gray-700",
          textColor: "text-gray-700",
          icon: <Shield className="w-5 h-5" />,
          features: [
            "1,000 words/month",
            "10MB upload limit",
            "Basic voices",
            "7-day history",
          ],
          description: "Great for getting started with voice synthesis",
        };
    }
  }, [profile?.plan]);

  const planDetails = useMemo(() => getPlanDetails(), [getPlanDetails]);

  const wordsLimit =
    profile?.words_limit && profile.words_limit > 0
      ? profile.words_limit
      : 1000;
  const planWordsUsed = profile?.plan_words_used || 0;
  const usagePercentage = Math.min((planWordsUsed / wordsLimit) * 100, 100);

  return (

   <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
  <div className="flex flex-col space-y-8">
    {/* Page Header */}
    <div className="sticky">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
    </div>





        <div>

          <h1 className="text-3xl font-extrabold tracking-tight text-center">Profile Settings</h1>
          <p className="text-muted-foreground  text-center mt-4">
            Manage your account, preferences, and subscription.
          </p>
        </div>

        {/* Mobile Profile Card */}
        <div className="block md:hidden">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <Avatar className="w-24 h-24 text-3xl">
                  <AvatarImage
                    src={profile?.avatar_url || ""}
                    alt={formData.full_name || "User"}
                  />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">
              {/* Word Balance Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Word Balance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-700 font-medium">Plan Words</div>
                    <div className="text-lg font-bold text-blue-900">
                      {(profile?.plan_words_used || 0).toLocaleString()} / {(profile?.words_limit || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600">
                      {Math.max(0, (profile?.words_limit || 0) - (profile?.plan_words_used || 0)).toLocaleString()} remaining
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700 font-medium">Purchased Words</div>
                    <div className="text-lg font-bold text-green-900">
                      {(profile?.word_balance || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">Never expire</div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="text-sm text-gray-700 font-medium">Total Available</div>
                  <div className="text-xl font-bold text-gray-900">
                    {(Math.max(0, (profile?.words_limit || 0) - (profile?.plan_words_used || 0)) + (profile?.word_balance || 0)).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Plan + Purchased words</div>
                </div>
              </div>

              <Separator />

                    {formData.full_name || "User"}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words text-center max-w-[90%] mx-auto">
  {formData.email}
</p>

                  <Badge
                    variant="outline"
                    className={`font-semibold ${planDetails.textColor}`}
                  >
                    {planDetails.name}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="md:col-span-2 flex flex-col gap-8">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription
                  className="mt-2">
                    Update your personal details and preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="pl-10 text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={handleInputChange}
                         placeholder="Optional"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        disabled
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Preferred Language</Label>
                    <Select
                      value={formData.preferred_language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Plan Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {planDetails.icon} {planDetails.name} Plan
                </CardTitle>
                <CardDescription>{planDetails.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm font-medium">
                    <span>Words Used</span>
                    <span>
                      {planWordsUsed.toLocaleString()} / {wordsLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />


                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {(100 - usagePercentage).toFixed(1)}% remaining this month
                  </p>
                </div>

                {/* Plan Expiry Information */}
                {profile?.plan !== 'free' && profile?.plan_expires_at && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Plan Expiry</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expires on:</span>
                      <span className="text-sm font-medium">
                        {new Date(profile.plan_expires_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Days remaining:</span>
                      <span className={`text-sm font-medium ${
                        Math.ceil((new Date(profile.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {Math.max(0, Math.ceil((new Date(profile.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    </div>
                  </div>
                )}




              {profile?.plan !== 'free' && profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date() && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Plan Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {planDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button
                  onClick={() => navigate("/payment")}
                  className={`w-full bg-gradient-to-r ${planDetails.color} hover:opacity-90 transition-opacity`}
                >
                  {profile?.plan === "free" ? "Upgrade Plan" : "Manage Plan"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8">
            {/* Desktop / Tablet Profile Card */}
            <Card className="hidden md:block">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <Avatar className="w-24 h-24 text-3xl">
                    <AvatarImage
                      src={profile?.avatar_url || ""}
                      alt={formData.full_name || "User"}
                    />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">
                      {formData.full_name || "User"}
                    </h2>
                    <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground break-words text-center max-w-[86%] mx-auto leading-snug">
  {formData.email}
</p>

                    <Badge
                      variant="outline"
                      className={`font-semibold ${planDetails.textColor}`}
                    >
                      {planDetails.name}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Once you delete your account, there is no going back. Your email will be permanently banned from creating new accounts.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
  variant="destructive"
  onClick={() => setShowDeleteConfirm(true)}
  className="w-full flex items-center justify-center gap-2 text-[11px] sm:text-xs md:text-sm lg:text-base py-2 sm:py-2.5 md:py-3 font-medium rounded-xl transition-all duration-200 hover:opacity-90 text-center whitespace-normal break-words leading-snug"
>
  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
  <span className="break-words max-w-full text-center">
    Delete My Account Forever
  </span>
</Button>



              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. To confirm, please type your email address:{" "}
              <span className="font-bold text-foreground">{user?.email}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="confirmEmail" className="sr-only">
              Confirm Email
            </Label>
            <Input
              id="confirmEmail"
              type="email"
              placeholder="Enter your email to confirm"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="border-destructive focus:ring-destructive"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                isDeleting ||
                confirmEmail.trim().toLowerCase() !== user.email?.toLowerCase()
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Account"
              )}

              {/* Show if plan has expired */}
              {profile?.plan === 'free' && profile?.plan_expires_at && new Date(profile.plan_expires_at) <= new Date() && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-sm text-orange-800 mb-1">Plan Status</h4>
                  <p className="text-xs text-orange-700">
                    Your previous plan expired on {new Date(profile.plan_expires_at).toLocaleDateString('en-IN')}. 
                    You're now on the free tier.
                  </p>
                </div>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;