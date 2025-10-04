// src/components/tool/ProSettingsPanel.tsx

import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProSettingsPanelProps {
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
}

const ProSettingsPanel = ({
  speed, setSpeed,
  pitch, setPitch,
  volume, setVolume,
  voiceStyle, setVoiceStyle,
  emotion, setEmotion,
  accent, setAccent,
}: ProSettingsPanelProps) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Advanced Controls</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Speed: {speed[0]}x</label>
          <Slider value={speed} onValueChange={setSpeed} min={0.5} max={2.0} step={0.1} className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Pitch: {pitch[0]}x</label>
          <Slider value={pitch} onValueChange={setPitch} min={0.5} max={2.0} step={0.1} className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Volume: {volume[0]}x</label>
          <Slider value={volume} onValueChange={setVolume} min={0.1} max={1.5} step={0.1} className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Voice Style</label>
          <Select value={voiceStyle} onValueChange={setVoiceStyle}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="news">News Reader</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Emotion</label>
          <Select value={emotion} onValueChange={setEmotion}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="happy">Happy</SelectItem>
              <SelectItem value="sad">Sad</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Accent</label>
          <Select value={accent} onValueChange={setAccent}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="american">American</SelectItem>
              <SelectItem value="british">British</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default ProSettingsPanel;
