
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Mic, Settings, Download, Info } from "lucide-react";
import { useState } from "react";

export const WorkflowSection = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const steps = [
    {
      number: 1,
      title: "Upload Document",
      description: "Upload PDF, image, or text file to extract content",
      icon: <Upload className="h-8 w-8" />,
      details: "Support for PDF, JPG, PNG, and TXT files up to your plan limit"
    },
    {
      number: 2,
      title: "Review Text",
      description: "Review and edit the extracted text content",
      icon: <FileText className="h-8 w-8" />,
      details: "Verify accuracy and make any necessary corrections (Translation and Grammer corrections)"
    },
    {
      number: 3,
      title: "Record Voice",
      description: "Record your voice sample for cloning",
      icon: <Mic className="h-8 w-8" />,
      details: "Record 10-20 seconds of clear speech in your chosen language"
    },
    {
      number: 4,
      title: "Generate Audio",
      description: "AI processes and generates your voice clone",
      icon: <Settings className="h-8 w-8" />,
      details: "Advanced AI creates natural-sounding speech in your voice With advanced settings"
    },
    {
      number: 5,
      title: "Download",
      description: "Download your generated audio file",
      icon: <Download className="h-8 w-8" />,
      details: "Download High quality audio in MP3, WAV, and more formats"
    }
  ];

  const toggleDetails = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  return (
    <section id="workflow" className="py-12 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-fade-in">
                      <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
How It Works</h2>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto mt-4">
            Transform your text into personalized voice audio in just 5 simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="animate-slide-up mb-8"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Desktop Layout */}
              <div className={`hidden md:flex items-center ${
                index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
              }`}>
                <div className="flex-1">
                  <Card className="border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                          <div className="text-white">{step.icon}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold mb-2 text-black">{step.title}</h3>
                          <p className="text-gray-600 mb-2">{step.description}</p>
                          <p className="text-sm text-gray-500">{step.details}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mx-8 flex-shrink-0 flex flex-col items-center">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{step.number}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                  )}
                </div>

                <div className="flex-1">
                  {index % 2 === 0 && <div></div>}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden">
                <Card className="border-gray-200 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{step.number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-2 text-black">{step.title}</h3>
                        <p className="text-gray-600 mb-3">{step.description}</p>
                        
                        <button
                          onClick={() => toggleDetails(index)}
                          className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Info className="h-4 w-4" />
                          <span className="text-sm">
                            {expandedStep === index ? 'Hide details' : 'More info'}
                          </span>
                        </button>
                        
                        {expandedStep === index && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg animate-fade-in">
                            <p className="text-sm text-gray-600">{step.details}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Connection line for mobile */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-0.5 h-6 bg-gray-300"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
