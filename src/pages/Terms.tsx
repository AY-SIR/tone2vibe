import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, CreditCard, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <FileText className="h-16 w-16 sm:h-12 sm:w-12 mx-auto mb-4 text-orange-600" />
          <h1 className="text-4xl sm:text-3xl xs:text-2xl font-bold mb-4 text-gray-900">
            Terms of Service
          </h1>
          <p className="text-lg sm:text-base text-gray-600">
            Please read these terms carefully before using our voice cloning service.
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: January 2025</p>
        </div>

        {/* Terms Cards */}
        <div className="space-y-8">
          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-sm">
                <Users className="h-5 w-5 text-emerald-600" />
                <span>Acceptance of Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                By accessing and using this voice synthesis platform, you accept and agree to be bound by these terms and conditions.
              </p>
              <p className="text-gray-600">
                If you do not agree to abide by the above, please do not use this service. We reserve the right to modify these terms at any time, and such modifications will be effective immediately upon posting.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Our platform provides AI-powered voice synthesis technology that allows users to:
              </p>
              <ul className="space-y-2 text-gray-600 ml-4 list-disc">
                <li>Convert text to speech using their own voice characteristics</li>
                <li>Upload various file formats (text, PDF, images) for conversion</li>
                <li>Access multiple language support and voice customization options</li>
                <li>Store and reuse voice models (free and paid plans both)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Lawful Use:</h4>
                <p className="text-gray-600">
                  You agree to use the service only for lawful purposes and in accordance with applicable laws and regulations.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Voice Rights:</h4>
                <p className="text-gray-600">
                  You must own the rights to any voice you clone or have explicit permission from the voice owner. Cloning voices without permission is strictly prohibited.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Content Responsibility:</h4>
                <p className="text-gray-600">
                  You are responsible for all content you upload and generate. Content must not be harmful, offensive, or infringe on others' rights.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-sm">
                <AlertTriangle className="h-5 w-5 text-emerald-600" />
                <span>Prohibited Uses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">You may not use our service for:</p>
              <ul className="space-y-2 text-gray-600 ml-4 list-disc">
                <li>Creating deepfakes or impersonating others without consent</li>
                <li>Generating harmful, abusive, or illegal content</li>
                <li>Violating intellectual property rights</li>
                <li>Spreading misinformation or false information</li>
                <li>Harassment, threats, or intimidation</li>
                <li>Any activity that violates local or international laws</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-sm">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <span>Payment Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Subscription Plans:</h4>
                <p className="text-gray-600">
                  Paid subscriptions are billed automatically. All fees are non-refundable except as required by law.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Limits:</h4>
                <p className="text-gray-600">
                  Each plan has specific word limits and upload restrictions. Exceeding limits may result in service suspension until upgrade.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Price Changes:</h4>
                <p className="text-gray-600">
                  We reserve the right to modify pricing with 30 days notice to existing subscribers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Our Rights:</h4>
                <p className="text-gray-600">
                Our platform and its technology are protected by intellectual property laws. You may not copy, modify, or reverse engineer our service.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Your Content:</h4>
                <p className="text-gray-600">
                  You retain ownership of your original content. By using our service, you grant us a limited license to process your content for service delivery.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Our platform is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of our service, including but not limited to:
              </p>
              <ul className="space-y-2 text-gray-600 ml-4 list-disc">
                <li>Loss of data or content</li>
                <li>Service interruptions or downtime</li>
                <li>Misuse of generated content by third parties</li>
                <li>Any indirect or consequential damages</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
              <p className="text-gray-600">
                You may terminate your account at any time through your account settings. Upon termination, your right to use the service will cease immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-gray-600">
                <p><strong>Email:</strong> support@tone2vibe.in</p>

              </div>
              <Button
                onClick={() => navigate("/contact")}
                className="mt-4 bg-gray-900 hover:bg-gray-700"
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;