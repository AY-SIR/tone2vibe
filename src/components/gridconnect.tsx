import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Mail, Instagram, Facebook, Twitter, Linkedin } from "lucide-react";

const services = [



 {
    name: "Twitter",
    description: "Share thoughts instantly & join trending moments.",
    icon: Twitter,
    url: "https://twitter.com/yourprofile", // Replace with your Twitter
    color: "#1DA1F2", // Twitter blue
  }

  ,{
    name: "Instagram",
    description: "Create, connect & vibe with your audience.",
    icon: Instagram,
    url: "https://instagram.com/yourprofile", // Replace with your Instagram
        color: "#E1306C", // Instagram pink

  },
  {
    name: "LinkedIn",
    description: "Build networks, showcase skills & unlock growth.",
    icon: Linkedin,
    url: "https://linkedin.com/in/yourprofile", // Replace with your LinkedIn
        color: "#0077B5", // LinkedIn blue

  },
];

const GridConnect = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <a
              key={service.name}
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full"
            >
              <Card className="cursor-pointer shadow-lg hover:scale-105 transition-transform duration-300 bg-white/70 backdrop-blur-md rounded-2xl h-full">
                <CardContent className="p-6 flex flex-col h-full">

                  {/* Top row: Icon + External Link */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full ">
                      <Icon className="w-8 h-8 " color={service.color} />
                    </div>
                    <ExternalLink
                      size={20}
                      aria-label={`Connect ${service.name}`}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    />
                  </div>

                  {/* Title + Description (left aligned) */}
                  <div className="flex flex-col text-left flex-grow">
                    <h3 className="text-lg font-semibold mb-2 text-slate-800">
                      {service.name}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default GridConnect;
