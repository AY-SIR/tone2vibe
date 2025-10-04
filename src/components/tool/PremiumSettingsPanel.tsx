// src/components/tool/PremiumSettingsPanel.tsx

import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown } from "lucide-react";

interface PremiumSettingsPanelProps {
  speed: number[];
  setSpeed: (value: number[]) => void;
  pitch: number[];
  setPitch: (value: number[]) => void;
  volume: number[];
  setVolume: (value: number[]) => void;
  voiceStyle: string;
  setVoiceStyle: (value: string) => void;
  emotion: string;
  setEmotion: (value: string) => void;
  accent: string;
  setAccent: (value: string) => void;
  voiceStability: number[];
  setVoiceStability: (value: number[]) => void;
  voiceClarity: number[];
  setVoiceClarity: (value: number[]) => void;
  breathingSound: number[];
  setBreathingSound: (value: number[]) => void;
  pauseLength: number[];
  setPauseLength: (value: number[]) => void;
  wordEmphasis: number[];
  setWordEmphasis: (value: number[]) => void;
}

const PremiumSettingsPanel = ({
  speed, setSpeed, pitch, setPitch, volume, setVolume, voiceStyle, setVoiceStyle,
  emotion, setEmotion, accent, setAccent, voiceStability, setVoiceStability,
  voiceClarity, setVoiceClarity, breathingSound, setBreathingSound, pauseLength, setPauseLength,
  wordEmphasis, setWordEmphasis
}: PremiumSettingsPanelProps) => {
  return (
    <div className="space-y-6">
      {/* Basic Controls */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Basic Advanced Controls</h4>
        <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
                <label className="text-sm font-medium">Speed: {speed[0]}x</label>
                <Slider value={speed} onValueChange={setSpeed} min={0.5} max={2.0} step={0.1} />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Pitch: {pitch[0]}x</label>
                <Slider value={pitch} onValueChange={setPitch} min={0.5} max={2.0} step={0.1} />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Volume: {volume[0]}x</label>
                <Slider value={volume} onValueChange={setVolume} min={0.1} max={1.5} step={0.1} />
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Voice Style</label>
                <Select value={voiceStyle} onValueChange={setVoiceStyle}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="natural">Natural</SelectItem><SelectItem value="news">News Reader</SelectItem><SelectItem value="conversational">Conversational</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Emotion</label>
                <Select value={emotion} onValueChange={setEmotion}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="happy">Happy</SelectItem><SelectItem value="sad">Sad</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Accent</label>
                <Select value={accent} onValueChange={setAccent}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">Default</SelectItem><SelectItem value="american">American</SelectItem><SelectItem value="british">British</SelectItem></SelectContent></Select>
            </div>
        </div>
      </div>

      {/* Premium God-Level Settings */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-semibold text-sm text-purple-700 border-b border-purple-200 pb-2 flex items-center">
          <Crown className="h-4 w-4 mr-2" />
          Premium God-Level Controls
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-700">Voice Stability: {voiceStability[0].toFixed(2)}</label>
            <Slider value={voiceStability} onValueChange={setVoiceStability} min={0.0} max={1.0} step={0.01} className="w-full [&>[role=slider]]:bg-purple-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-700">Voice Clarity: {voiceClarity[0].toFixed(2)}</label>
            <Slider value={voiceClarity} onValueChange={setVoiceClarity} min={0.0} max={1.0} step={0.01} className="w-full [&>[role=slider]]:bg-purple-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-700">Breathing Sound: {breathingSound[0].toFixed(2)}</label>
            <Slider value={breathingSound} onValueChange={setBreathingSound} min={0.0} max={1.0} step={0.01} className="w-full [&>[role=slider]]:bg-purple-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-700">Pause Length: {pauseLength[0].toFixed(1)}x</label>
            <Slider value={pauseLength} onValueChange={setPauseLength} min={0.5} max={3.0} step={0.1} className="w-full [&>[role=slider]]:bg-purple-500" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-purple-700">Word Emphasis: {wordEmphasis[0].toFixed(2)}</label>
            <Slider value={wordEmphasis} onValueChange={setWordEmphasis} min={0.5} max={2.0} step={0.01} className="w-full [&>[role=slider]]:bg-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumSettingsPanel;
