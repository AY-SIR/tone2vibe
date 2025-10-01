"use client"

import React, { forwardRef, useRef, useState } from "react"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import {
  Mic,
  Zap,
  FileText,
  HardDrive,
  MessageSquare,
  File,
  X, // Import the X icon for the close button
} from "lucide-react"

// Utility function for class names
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(" ")
}

// ----------------------------------------------------------------------
// STEP 4: Update the Circle component to accept additional props like onClick
// ----------------------------------------------------------------------
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 cursor-pointer items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className
      )}
      {...props} // Spread the rest of the props here
    >
      {children}
    </div>
  )
})

Circle.displayName = "Circle"


// ----------------------------------------------------------------------
// STEP 2: Create a new component for the popup
// ----------------------------------------------------------------------
const MicPopup = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  if (!isOpen) {
    return null
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      {/* Popup container */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-800"
        >
          <X size={24} />
        </button>

        {/* Popup content */}
        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gray-100">
           <Mic size={40} className="text-gray-800" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">
          Microphone Activated
        </h2>
        <p className="text-gray-600">
          This is the popup that appears when you click the microphone. You can
          add any component or content here, like a voice recorder.
        </p>
      </div>
    </div>
  )
}


export default function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const div1Ref = useRef<HTMLDivElement>(null)
  const div2Ref = useRef<HTMLDivElement>(null)
  const div3Ref = useRef<HTMLDivElement>(null)
  const div4Ref = useRef<HTMLDivElement>(null)
  const div5Ref = useRef<HTMLDivElement>(null)
  const div6Ref = useRef<HTMLDivElement>(null)
  const div7Ref = useRef<HTMLDivElement>(null)

  // ----------------------------------------------------------------------
  // STEP 1: Add state to manage the popup's visibility
  // ----------------------------------------------------------------------
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="relative flex h-[300px] w-full max-w-7xl items-center justify-center p-10"
        ref={containerRef}
      >
        <div className="flex size-full max-h-[200px] max-w-lg flex-col items-stretch justify-between gap-10">
          <div className="flex flex-row items-center justify-between">
            <Circle ref={div1Ref}>
              <Icons.googleDrive />
            </Circle>
            <Circle ref={div5Ref}>
              <Icons.googleDocs />
            </Circle>
          </div>
          <div className="flex flex-row items-center justify-between">
            <Circle ref={div2Ref}>
              <Icons.notion />
            </Circle>

            {/* ---------------------------------------------------------------------- */}
            {/* STEP 3: Add the onClick handler to the microphone's Circle           */}
            {/* ---------------------------------------------------------------------- */}
            <Circle
              ref={div4Ref}
              className="size-16"
              onClick={() => setIsPopupOpen(true)}
            >
              <Icons.mic />
            </Circle>

            <Circle ref={div6Ref}>
              <Icons.zapier />
            </Circle>
          </div>
          <div className="flex flex-row items-center justify-between">
            <Circle ref={div3Ref}>
              <Icons.whatsapp />
            </Circle>
            <Circle ref={div7Ref}>
              <Icons.messenger />
            </Circle>
          </div>
        </div>

        {/* AnimatedBeam components remain the same */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div1Ref}
          toRef={div4Ref}
          curvature={-75}
          endYOffset={-10}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div2Ref}
          toRef={div4Ref}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div3Ref}
          toRef={div4Ref}
          curvature={75}
          endYOffset={10}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div5Ref}
          toRef={div4Ref}
          curvature={-75}
          endYOffset={-10}
          reverse
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div6Ref}
          toRef={div4Ref}
          reverse
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div7Ref}
          toRef={div4Ref}
          curvature={75}
          endYOffset={10}
          reverse
        />
      </div>

      {/* Render the popup component conditionally */}
      <MicPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
    </div>
  )
}

const Icons = {
  googleDrive: () => <HardDrive size={40} color="#0066da" />,
  googleDocs: () => <File size={40} color="#4285F4" />,
  notion: () => <FileText size={40} color="#000" />,
  whatsapp: () => <MessageSquare size={40} color="#25D366" />,
  zapier: () => <Zap size={40} color="#FF4A00" />,
  messenger: () => <MessageSquare size={40} color="#0084FF" />,
  mic: () => <Mic size={40} color="#000" />,
}