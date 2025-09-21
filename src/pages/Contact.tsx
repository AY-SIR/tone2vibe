import { useEffect } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Save contact message to Supabase using raw query to bypass type checking
      const { error } = await supabase
        .from('contact_messages' as any)
        .insert([
          {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
          }
        ] as any);

      if (error) {
        throw error;
      }
      
      setIsSubmitted(true);
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };



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

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 animate-fade-in">
            <Mail className="h-16 w-16 text-black mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">Get in Touch</h1>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
              Have questions about Tone2Vibe? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <Card className="shadow-xl border border-gray-200 bg-white animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-black">
                  <MessageSquare className="h-5 w-5" />
                  <span>Send us a Message</span>
                  {!user && <Lock className="h-4 w-4 text-orange-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center py-8 space-y-4">
                    <Lock className="h-16 w-16 text-orange-600 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-900">Login Required</h3>
                    <p className="text-gray-600">
                      Please sign in to send us a message. This helps us provide better support and follow up on your inquiry.
                    </p>
                    <Button 
                      onClick={() => setShowAuthModal(true)}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      Sign In to Continue
                    </Button>
                  </div>
                ) : !isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          className="border-gray-300 focus:border-black"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="border-gray-300 focus:border-black"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-black"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        className="border-gray-300 focus:border-black resize-none"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-black hover:bg-gray-800 text-white transform hover:scale-105 transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                    <h3 className="text-xl font-semibold text-green-600">Message Sent Successfully!</h3>
                    <p className="text-gray-600">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button 
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Send Another Message
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-600">support@tone2vibe.in</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">Response Time</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We typically respond to all inquiries within 24 hours during business days. 
                    For urgent matters, please include "URGENT" in your subject line.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">What to Include</h3>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Detailed description of your question or issue</li>
                    <li>• Your account email (if applicable)</li>
                    <li>• Screenshots or error messages (if relevant)</li>
                    <li>• Steps you've already tried</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>



      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
};

export default Contact;
