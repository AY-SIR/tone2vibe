import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModernAudioPlayerProps {
  srcUrl?: string;                // Audio file URL
  srcData?: string;               // Base64 audio data
  mimeType?: 'audio/webm' | 'audio/mpeg';  // Support both WEBM and MP3
  trackTitle: string;
}

export const ModernAudioPlayer: React.FC<ModernAudioPlayerProps> = ({
  srcUrl,
  srcData,
  mimeType,
  trackTitle,
}) => {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSupported, setIsSupported] = useState(true);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsAudioReady(false);
    setIsSupported(true);

    if (mimeType && mimeType !== 'audio/webm' && mimeType !== 'audio/mpeg') {
      toast({
        title: 'Audio Error',
        description: 'Only WEBM and MP3 audio formats are supported.',
        variant: 'destructive',
      });
      setIsSupported(false);
      return;
    }

    const audioElement = new Audio();

    // ======= Load base64 or URL source =======
    if (srcData) {
      try {
        const base64String = srcData.includes(',') ? srcData.split(',')[1] : srcData;
        const byteCharacters = atob(base64String);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType || 'audio/webm' });
        audioElement.src = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error decoding base64 audio:', error);
        toast({
          title: 'Audio Error',
          description: 'Invalid Base64 audio data.',
          variant: 'destructive',
        });
        setIsSupported(false);
        return;
      }
    } else if (srcUrl) {
      audioElement.src = srcUrl;
    } else {
      toast({
        title: 'Audio Error',
        description: 'No audio source provided.',
        variant: 'destructive',
      });
      setIsSupported(false);
      return;
    }

    // ======= Event Handlers =======
    const onLoadedMetadata = () => {
      setDuration(audioElement.duration);
      setIsAudioReady(true);
    };

    const onTimeUpdate = () => setCurrentTime(audioElement.currentTime);

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      console.error('Audio failed to load.', {
        src: audioElement.src,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
        error: audioElement.error,
      });
      toast({
        title: 'Audio Error',
        description: 'Could not load the audio file. Check the URL or Base64 data.',
        variant: 'destructive',
      });
    };

    audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
    audioElement.addEventListener('timeupdate', onTimeUpdate);
    audioElement.addEventListener('ended', onEnded);
    audioElement.addEventListener('error', onError);

    setAudio(audioElement);

    return () => {
      audioElement.pause();
      if (srcData && audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioElement.src);
      }
      audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioElement.removeEventListener('timeupdate', onTimeUpdate);
      audioElement.removeEventListener('ended', onEnded);
      audioElement.removeEventListener('error', onError);
    };
  }, [srcUrl, srcData, mimeType, toast]);

  // ======= Play / Pause =======
  const togglePlayPause = async () => {
    if (!audio || !isAudioReady || !isSupported) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        toast({
          title: 'Playback Error',
          description: 'The audio could not be played.',
          variant: 'destructive',
        });
      }
    }
  };

  // ======= Volume =======
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audio) audio.volume = newVolume;
  };

  // ======= Scrub Progress =======
  const handleProgressScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audio || !isAudioReady || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = duration * percentage;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ======= JSX =======
  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/15 rounded-xl p-4 sm:p-6 border border-primary/20 space-y-4">
      <p className="font-semibold text-center sm:text-left text-foreground truncate">{trackTitle}</p>

      {!isSupported && (
        <p className="text-sm text-destructive text-center">Unsupported audio format.</p>
      )}

      {/* Progress Bar */}
      <div className="w-full flex items-center space-x-3">
        <span className="text-xs font-mono text-muted-foreground w-10 text-center">{formatTime(currentTime)}</span>
        <div
          ref={progressBarRef}
          onClick={handleProgressScrub}
          className={`relative w-full h-2 rounded-full group cursor-pointer ${isSupported ? 'bg-muted/50' : 'bg-muted/20'}`}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-10 text-center">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center sm:justify-between space-x-4">
        <Button
          onClick={togglePlayPause}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={!isAudioReady || !isSupported}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </Button>

        <div className="hidden sm:flex items-center space-x-2 w-32">
          {volume === 0 ? <VolumeX className="w-5 h-5 text-muted-foreground"/> : <Volume2 className="w-5 h-5 text-muted-foreground"/> }
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted/50"
            disabled={!isSupported}
          />
        </div>
      </div>
    </div>
  );
};
