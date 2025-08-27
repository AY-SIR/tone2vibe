
export type AudioFormat = 'mp3' | 'wav' | 'aac' | 'm4a' | 'ogg' | 'flac';

export interface ConversionOptions {
  format: AudioFormat;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  bitrate?: number;
}

class AudioConverter {
  async convertToFormat(audioDataUrl: string, options: ConversionOptions): Promise<Blob> {
    try {
      // For now, return the original audio as blob since browser doesn't have native conversion
      // In production, this would use Web Audio API or server-side conversion
      
      const response = await fetch(audioDataUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Return as appropriate mime type
      const mimeType = this.getMimeType(options.format);
      return new Blob([arrayBuffer], { type: mimeType });
    } catch (error) {
      console.error('Audio conversion failed:', error);
      throw new Error('Failed to convert audio format');
    }
  }

  private getMimeType(format: AudioFormat): string {
    const mimeTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
      flac: 'audio/flac'
    };
    return mimeTypes[format] || 'audio/mpeg';
  }

  async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio'));
      });
      
      audio.src = url;
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const audioConverter = new AudioConverter();
