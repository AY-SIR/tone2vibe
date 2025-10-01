"use client"

import React, { forwardRef, useRef, useState, useEffect } from "react"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { Mic, File, HardDrive, X } from "lucide-react"

// Utility function for class names
const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" ")

// ----------------------------------------------------------------------
// Circle Component for Mic
// ----------------------------------------------------------------------
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

Circle.displayName = "Circle"

// ----------------------------------------------------------------------
// Card Component
// ----------------------------------------------------------------------
const Card = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full max-w-md rounded-xl border-2 border-gray-300 bg-white p-6 shadow-lg flex items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = "Card"

// ----------------------------------------------------------------------
// Mic Popup
// ----------------------------------------------------------------------
const MicPopup = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-800"
        >
          <X size={24} />
        </button>

        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gray-100">
          <Mic size={40} className="text-gray-800" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">
          Microphone Activated
        </h2>
        <p className="text-gray-600">This is the popup that appears when you click the microphone.</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Utility: Get edge point for card border
// ----------------------------------------------------------------------
const getCardEdgePoint = (fromEl: HTMLDivElement, toEl: HTMLDivElement) => {
  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()

  const fromCenterX = fromRect.left + fromRect.width / 2
  const fromCenterY = fromRect.top + fromRect.height / 2
  const toCenterX = toRect.left + toRect.width / 2
  const toCenterY = toRect.top + toRect.height / 2

  const dx = toCenterX - fromCenterX
  const dy = toCenterY - fromCenterY

  const w = fromRect.width / 2
  const h = fromRect.height / 2

  let scale = 1
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    scale = h / Math.abs(dy)
  } else {
    scale = w / Math.abs(dx)
  }

  return {
    x: fromCenterX + dx * scale,
    y: fromCenterY + dy * scale,
  }
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function AnimatedBeamDemoMobile() {
  const containerRef = useRef<HTMLDivElement>(null)

  const topCardRef = useRef<HTMLDivElement>(null)
  const bottomCardRef = useRef<HTMLDivElement>(null)
  const micRef = useRef<HTMLDivElement>(null)

  const [isPopupOpen, setIsPopupOpen] = useState(false)

  // Force re-render to recalc beam positions on resize
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center gap-16">
        {/* Top Card */}
        <Card ref={topCardRef}>
          <Icons.googleDrive />
        </Card>

        {/* Center Mic */}
        <Circle ref={micRef} className="size-16" onClick={() => setIsPopupOpen(true)}>
          <Icons.mic />
        </Circle>

        {/* Bottom Card */}
        <Card ref={bottomCardRef}>
          <Icons.googleDocs />
        </Card>

        {/* Animated Beam from Top Card to Bottom Card */}
        {topCardRef.current && bottomCardRef.current && (
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={topCardRef}
            toRef={bottomCardRef}
            curvature={50}
          />
        )}

        {/* Animated Beam from Top Card to Mic */}
        {topCardRef.current && micRef.current && (
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={topCardRef}
            toRef={micRef}
            curvature={-30}
          />
        )}

        {/* Animated Beam from Bottom Card to Mic */}
        {bottomCardRef.current && micRef.current && (
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={bottomCardRef}
            toRef={micRef}
            curvature={30}
          />
        )}
      </div>

      {/* Mic Popup */}
      <MicPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
    </div>
  )
}

// ----------------------------------------------------------------------
// Icons
// ----------------------------------------------------------------------
const Icons = {
  googleDrive: () => <HardDrive size={40} color="#0066da" />,
  googleDocs: () => <File size={40} color="#4285F4" />,
  mic: () => <Mic size={40} color="#000" />,
}
