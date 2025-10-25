import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Eye, Lock, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();


useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Header Section */}
<div className="text-center mb-8 md:mb-12 animate-fade-in">
  <div className="flex items-center justify-center gap-3 mb-3 md:mb-4">
    <Shield className="h-10 w-10 md:h-12 md:w-12 text-orange-600" />
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Privacy Policy</h1>
  </div>
  <p className="text-base md:text-lg text-gray-600 px-4">
    Your privacy is our priority. Learn how we protect and handle your data.
  </p>
  <p className="text-sm text-gray-500 mt-2">Last updated: January 2025</p>
</div>

        {/* Privacy Cards */}
        <div className="space-y-6 md:space-y-8">
          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <Eye className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                <span>Information We Collect</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Account Information:</h4>
                <p className="text-gray-600 text-sm md:text-base m-0">
                  <strong>Email address:</strong> for account identification and communication.<br />
                  <strong>IP address:</strong> for security monitoring and service optimization.<br />
                  <strong>Authentication data:</strong> securely encrypted for account access.<br />
                  <strong>Plan details:</strong> subscription type and usage limits for service delivery.
                </p>


              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Voice Data:</h4>
                <p className="text-gray-600 text-sm md:text-base">Voice recordings for synthesis. Sample voices are temporary and not stored. User-generated voices follow plan-based retention policies.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Usage Analytics:</h4>
                <p className="text-gray-600 text-sm md:text-base">Word count, feature usage, and performance metrics to improve our service quality.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <Lock className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                <span>How We Protect Your Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Encryption:</h4>
                <p className="text-gray-600 text-sm md:text-base">All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Access Controls:</h4>
                <p className="text-gray-600 text-sm md:text-base">Strict access controls ensure only authorized personnel can access user data, and only when necessary for support.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Data Minimization:</h4>
                <p className="text-gray-600 text-sm md:text-base">We collect only the minimum data necessary to provide our services effectively.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <Database className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                <span>Data Retention & Deletion</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Free Users:</h4>
                <p className="text-gray-600 text-sm md:text-base">Voice recordings are processed for immediate conversion and automatically deleted within 7 days  No permanent storage of voice data.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Paid Users:</h4>
                <p className="text-gray-600 text-sm md:text-base">Voice models can be stored 30 days and 90 days according to user plan .Users can request immediate deletion at any time.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm md:text-base">Account Deletion:</h4>
                <p className="text-gray-600 text-sm md:text-base">Upon account deletion, all personal data and voice models are permanently removed within 30 days.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600 text-sm md:text-base">
                <li>• <strong>Access:</strong> Request copies of your personal data</li>
                <li>• <strong>Rectification:</strong> Correct inaccurate personal data</li>
                <li>• <strong>Erasure:</strong> Request deletion of your personal data</li>
                <li>• <strong>Portability:</strong> Receive your data in a structured format</li>
                <li>• <strong>Objection:</strong> Object to certain processing activities</li>
                <li>• <strong>Restriction:</strong> Request restriction of processing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm md:text-base">
                We use trusted third-party services for specific functionalities:
              </p>
              <ul className="space-y-2 text-gray-600 text-sm md:text-base">
                <li>• <strong>Supabase:</strong> Database and authentication services</li>
                <li>• <strong>Payment Processors:</strong> Secure payment processing (PCI compliant)</li>
                <li>• <strong>Cloud Storage:</strong> Temporary file processing and delivery</li>
              </ul>
              <p className="text-gray-600 mt-4 text-sm md:text-base">
                All third-party services are carefully vetted and bound by strict data protection agreements.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-lift animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm md:text-base">
                If you have any questions about this Privacy Policy or our data practices:
              </p>
              <div className="space-y-2 text-gray-600 text-sm md:text-base">
                <p><strong>Email:</strong> support@tone2vibe.in</p>

              </div>
              <Button
                onClick={() => navigate('/contact')}
                className="mt-4 bg-gray-900 hover:bg-gray-700 text-sm md:text-base"
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

export default Privacy;
