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

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    company: "",
    country: "",
    preferred_language: "en-US",
  });

  useEffect(() => {
    setFormData({
      full_name: profile?.full_name || "User",
      email: profile?.email || user?.email || "",
      company: profile?.company || "",
      country: profile?.country || "",
      preferred_language: profile?.preferred_language || "en-US",
    });
  }, [profile, user]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  if (loading) return <ProfileSkeleton />;
  if (!user) return null;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

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
      } catch {
        toast({
          title: "Update failed",
          description: "Could not update profile. Please try again.",
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
      navigate("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
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
    if (formData.email) return formData.email[0].toUpperCase();
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
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight text-center">
            Profile Settings
          </h1>
          <p className="text-muted-foreground text-center mt-4">
            Manage your account, preferences, and subscription.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column: Profile & Plan */}
          <div className="md:col-span-2 flex flex-col gap-8">
          {/* Mobile Profile Card - visible only on small screens */}
<div className="block md:hidden">
  <Card>
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
          <p className="text-xs text-muted-foreground break-words">
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

            {/* Profile Info Form */}
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription className="mt-2">
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
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

            {/* Plan Details */}
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
                      {planWordsUsed.toLocaleString()} /{" "}
                      {wordsLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {(100 - usagePercentage).toFixed(1)}% remaining this month
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Word Balance</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Purchased Words:
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {(profile?.word_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total Available:
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      {(
                        (profile?.words_limit || 0) -
                        (profile?.plan_words_used || 0) +
                        (profile?.word_balance || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {profile?.plan !== "free" && profile?.plan_expires_at && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Plan Expiry</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Expires on:
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(profile.plan_expires_at).toLocaleDateString(
                          "en-IN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Plan Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {planDetails.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{f}</span>
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

          {/* Right Column: Avatar + Danger Zone */}
          <div className="flex flex-col gap-8">
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
                    <p className="text-xs text-muted-foreground break-words">
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

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Once deleted, your email will be permanently banned from
                  creating new accounts.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md w-[90%] rounded-2xl mx-auto px-4 sm:px-6 py-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please type your email to confirm:{" "}
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
                confirmEmail.trim().toLowerCase() !==
                  user.email?.toLowerCase()
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
