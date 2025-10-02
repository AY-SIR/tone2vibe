"use client"

import React, { forwardRef, useRef, useState } from "react"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { Mic, Zap, FileText, HardDrive, MessageSquare, File, X, Languages, Shield,  Volume2,  Download, Globe } from "lucide-react"

// Utility function
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(" ")
}

// Circle component
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex size-12 cursor-pointer items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Circle.displayName = "Circle"

// Card component
const Card = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex flex-col items-center justify-center rounded-xl border-2 bg-white p-2 shadow-lg transition-transform duration-300",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = "Card"

// Mic popup
const MicPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-800">
          <X size={24} />
        </button>
        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gray-100">
          <Mic size={40} className="text-gray-800" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">Microphone Activated</h2>
        <p className="text-gray-600">
          This is the popup that appears when you click the microphone. You can add any component or content here, like a voice recorder.
        </p>
      </div>
    </div>
  )
}

// Main component
export default function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const div1Ref = useRef<HTMLDivElement>(null)
  const div2Ref = useRef<HTMLDivElement>(null)
  const div3Ref = useRef<HTMLDivElement>(null)
  const div4Ref = useRef<HTMLDivElement>(null)
  const div5Ref = useRef<HTMLDivElement>(null)
  const div6Ref = useRef<HTMLDivElement>(null)
  const div7Ref = useRef<HTMLDivElement>(null)

  const [isPopupOpen, setIsPopupOpen] = useState(false)

  return (
    <div className="flex items-center justify-center p-4 md:p-20 lg:p-20 mt-12 mb-8">
      <div ref={containerRef} className="relative flex w-full max-w-7xl items-center justify-center">
        <div className="flex flex-col items-stretch justify-between gap-6 w-full  md:max-w-4xl mx-auto">
          {/* First row: Card up */}
          <div className="flex flex-row items-center justify-between gap-4">
            <Card
              ref={div1Ref}
              className="-translate-y-12 sm:-translate-y-16 md:-translate-y-20 w-60 sm:w-64 md:w-72 h-40 sm:h-48 md:h-52 p-4"
            >
              <div className="flex flex-col items-center justify-start h-full">
                <div className="flex items-center justify-start gap-2">
                  {/* Icon */}
                  <Icons.Shield />
                  {/* Heading */}
                  <h3 className="text-lg font-semibold text-gray-800">Privacy & Security</h3>
                </div>

                {/* Separator */}
                <hr className="w-full border-t border-gray-300 mb-2" />

                {/* Optional description */}
                <p className="text-sm text-gray-600 text-center">
                  Your voice data is encrypted and never misused.
                </p>
                <hr className="w-full border-t border-gray-300 mb-2" />

                {/* Optional description */}
                <p className="text-sm text-gray-600 text-center">
                  Clone your voice with studio-quality accuracy.
                </p>
               <hr className="w-full border-t border-gray-300 mb-2 mt-4 hidden sm:block" />
<p className="text-sm text-gray-600 text-center hidden sm:block">Secure and Encripeted</p>
 </div>
            </Card>

            <Circle ref={div5Ref}>
              <Icons. Volume2 />
            </Circle>
          </div>

          {/* Second row: Center */}
          <div className="flex flex-row items-center justify-between gap-4">
            <Circle ref={div2Ref}>
              <Icons.Globe />
            </Circle>
            <Circle ref={div4Ref} className="size-16">
              <Icons.mic />
            </Circle>
            <Circle ref={div6Ref}>
              <Icons.zapier />
            </Circle>
          </div>

          {/* Third row: Card down */}
          <div className="flex flex-row items-center justify-between gap-4">
            <Circle ref={div3Ref}>
              <Icons. Download/>
            </Circle>
            <Card
              ref={div7Ref}
              className="translate-y-12 sm:translate-y-10 md:translate-y-20 w-56 sm:w-64 md:w-72 h-40 sm:h-48 md:h-52 p-4"
            >
              <div className="flex flex-col items-center justify-start h-full">
                {/* Icon */}
                <div className="flex items-center justify-center gap-2">
                  <Icons.Languages />
                  <h3 className="text-lg font-semibold text-gray-800">50+ Languages</h3>
                </div>

                <hr className="w-full border-t border-gray-300 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  Convert text to speech in over 50 languages.
                </p>
                <hr className="w-full border-t border-gray-300 mb-2" />
                <p className="text-sm text-gray-600 text-center">Control pitch, speed, and emotion in speech.</p>
               <hr className="w-full border-t border-gray-300 mb-2 mt-4 hidden sm:block" />
<p className="text-sm text-gray-600 text-center hidden sm:block">Lightning Fast</p>

              </div>
            </Card>
          </div>
        </div>

        {/* Animated beams */}
        <AnimatedBeam containerRef={containerRef} fromRef={div1Ref} toRef={div4Ref} curvature={-75} endYOffset={-10} />
        <AnimatedBeam containerRef={containerRef} fromRef={div2Ref} toRef={div4Ref} />
        <AnimatedBeam containerRef={containerRef} fromRef={div3Ref} toRef={div4Ref} curvature={75} endYOffset={10} />
        <AnimatedBeam containerRef={containerRef} fromRef={div5Ref} toRef={div4Ref} curvature={-75} endYOffset={-10} reverse />
        <AnimatedBeam containerRef={containerRef} fromRef={div6Ref} toRef={div4Ref} reverse />
        <AnimatedBeam containerRef={containerRef} fromRef={div7Ref} toRef={div4Ref} curvature={75} endYOffset={10} reverse />
      </div>
    </div>
  )
}

// Icons
const Icons = {
  Shield: () => <Shield size={22} color="#0066da" />,
   Volume2: () => < Volume2 size={40} color="#4285F4" />,
  Globe: () => <Globe size={40} color="#000" />,
   Download: () => < Download size={40} color="#25D366" />,
  zapier: () => <Zap size={40} color="#FF4A00" />,
  Languages: () => <Languages size={22} color="#0084FF" />,
  mic: () => <Mic size={40} color="#000" />,
}
