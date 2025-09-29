import { card, cardcontent } from "/components/ui/card";
import { upload, filetext, mic, settings, download, info } from "lucide-react";
import { usestate } from "react";

export const workflowsection = () => {
  const [expandedstep, setexpandedstep] = usestate<number | null>(null);

  const steps = [
    {
      number: 1,
      title: "upload document",
      description: "upload pdf, image, or text file to extract content",
      icon: <upload classname="h-8 w-8" />,
      details: "support for pdf, jpg, png, and txt files up to your plan limit"
    },
    {
      number: 2,
      title: "review text",
      description: "review and edit the extracted text content",
      icon: <filetext classname="h-8 w-8" />,
      details: "verify accuracy and make any necessary corrections (translation and grammer corrections)"
    },
    {
      number: 3,
      title: "record voice",
      description: "record your voice sample for cloning",
      icon: <mic classname="h-8 w-8" />,
      details: "record 10-20 seconds of clear speech in your chosen language"
    },
    {
      number: 4,
      title: "generate audio",
      description: "ai processes and generates your voice clone",
      icon: <settings classname="h-8 w-8" />,
      details: "advanced ai creates natural-sounding speech in your voice with advanced settings"
    },
    {
      number: 5,
      title: "download",
      description: "download your generated audio file",
      icon: <download classname="h-8 w-8" />,
      details: "download high quality audio in mp3, wav, and more formats"
    }
  ];

  const toggledetails = (index: number) => {
    setexpandedstep(expandedstep === index ? null : index);
  };

  return (
    <section id="workflow" classname="py-12 px-4 bg-white">
      <div classname="container mx-auto">
        <div classname="text-center mb-16 animate-fade-in">
                      <h2 classname="text-4xl sm:text-5xl font-extrabold tracking-tight">
how it works</h2>
          <p classname="text-gray-600 text-xl max-w-2xl mx-auto mt-4">
            transform your text into personalized voice audio in just 5 simple steps
          </p>
        </div>

        <div classname="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              classname="animate-slide-up mb-8"
              style={{ animationdelay: `${index * 0.1}s` }}
            >
              {/* desktop layout */}
              <div classname={`hidden md:flex items-center ${
                index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
              }`}>
                <div classname="flex-1">
                  <card classname="border-gray-200 hover:shadow-lg transition-all duration-300">
                    <cardcontent classname="p-6">
                      <div classname="flex items-start space-x-4">
                        <div classname="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                          <div classname="text-white">{step.icon}</div>
                        </div>
                        <div classname="flex-1 min-w-0">
                          <h3 classname="text-xl font-bold mb-2 text-black">{step.title}</h3>
                          <p classname="text-gray-600 mb-2">{step.description}</p>
                          <p classname="text-sm text-gray-500">{step.details}</p>
                        </div>
                      </div>
                    </cardcontent>
                  </card>
                </div>

                <div classname="mx-8 flex-shrink-0 flex flex-col items-center">
                  <div classname="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <span classname="text-white font-bold text-sm">{step.number}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div classname="w-0.5 h-8 bg-gray-300 mt-2"></div>
                  )}
                </div>

                <div classname="flex-1">
                  {index % 2 === 0 && <div></div>}
                </div>
              </div>

              {/* mobile layout */}
              <div classname="md:hidden px-2"> {/* Added px-2 here */}
                <card classname="border-gray-200 hover:shadow-lg transition-all duration-300">
                  <cardcontent classname="p-6">
                    <div classname="flex items-start space-x-4">
                      <div classname="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                        <span classname="text-white font-bold text-sm">{step.number}</span>
                      </div>
                      <div classname="flex-1 min-w-0">
                        <h3 classname="text-lg font-bold mb-2 text-black">{step.title}</h3>
                        <p classname="text-gray-600 mb-3">{step.description}</p>
                        
                        <button
                          onclick={() => toggledetails(index)}
                          classname="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <info classname="h-4 w-4" />
                          <span classname="text-sm">
                            {expandedstep === index ? 'hide details' : 'more info'}
                          </span>
                        </button>
                        
                        {expandedstep === index && (
                          <div classname="mt-3 p-3 bg-gray-50 rounded-lg animate-fade-in">
                            <p classname="text-sm text-gray-600">{step.details}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </cardcontent>
                </card>
                
                {/* connection line for mobile */}
                {index < steps.length - 1 && (
                  <div classname="flex justify-center py-2">
                    <div classname="w-0.5 h-6 bg-gray-300"></div>
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
