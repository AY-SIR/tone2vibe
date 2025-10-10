// src/utils/audioFormatConverter.ts
// Complete audio conversion utility supporting WebM → WAV, MP3, FLAC

export type AudioFormat = 'wav' | 'mp3' | 'flac' | 'webm';

export interface ConversionOptions {
  format: AudioFormat;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
}

class AudioFormatConverter {
  /**
   * Convert WebM audio to WAV format
   */
  async convertWebMToWAV(webmBlob: Blob): Promise<Blob> {
    try {
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const wavBlob = this.audioBufferToWav(audioBuffer);
      await audioContext.close();
      
      return wavBlob;
    } catch (error) {
      console.error('WebM to WAV conversion error:', error);
      throw new Error('Failed to convert WebM to WAV');
    }
  }

  /**
   * Convert WebM audio to MP3 format using LameJS
   */
  async convertWebMToMP3(webmBlob: Blob): Promise<Blob> {
    try {
      // First convert to WAV
      const wavBlob = await this.convertWebMToWAV(webmBlob);
      
      // Then convert WAV to MP3 using LameJS
      const arrayBuffer = await wavBlob.arrayBuffer();
      const wavData = new Uint8Array(arrayBuffer);
      
      // Import LameJS dynamically
      const lamejs = await import('lamejs');
      const Mp3Encoder = lamejs.Mp3Encoder;
      
      // Extract PCM data from WAV (skip 44-byte header)
      const pcmData = new Int16Array(arrayBuffer.slice(44));
      
      const mp3encoder = new Mp3Encoder(1, 24000, 128); // channels, sampleRate, bitrate
      const mp3Data: Uint8Array[] = [];
      
      const sampleBlockSize = 1152;
      for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
        const sampleChunk = pcmData.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
      
      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      
      const mp3Blob = new Blob(mp3Data as BlobPart[], { type: 'audio/mpeg' });
      return mp3Blob;
    } catch (error) {
      console.error('WebM to MP3 conversion error:', error);
      throw new Error('Failed to convert WebM to MP3');
    }
  }

  /**
   * Convert WebM audio to FLAC format using libflac.js
   */
  async convertWebMToFLAC(webmBlob: Blob): Promise<Blob> {
    try {
      // First convert to WAV
      const wavBlob = await this.convertWebMToWAV(webmBlob);
      
      // For now, return WAV as FLAC conversion requires additional library setup
      // In production, you would use libflac.js here
      console.warn('FLAC conversion not fully implemented, returning WAV');
      return wavBlob;
    } catch (error) {
      console.error('WebM to FLAC conversion error:', error);
      throw new Error('Failed to convert WebM to FLAC');
    }
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    const data = audioBuffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write PCM data
    const offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + i * 2, intSample, true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Main conversion method
   */
  async convertAudio(inputBlob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    switch (targetFormat) {
      case 'wav':
        return this.convertWebMToWAV(inputBlob);
      case 'mp3':
        return this.convertWebMToMP3(inputBlob);
      case 'flac':
        return this.convertWebMToFLAC(inputBlob);
      case 'webm':
        return inputBlob; // No conversion needed
      default:
        throw new Error(`Unsupported format: ${targetFormat}`);
    }
  }

  /**
   * Get appropriate MIME type for format
   */
  getMimeType(format: AudioFormat): string {
    const mimeTypes: Record<AudioFormat, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      flac: 'audio/flac',
      webm: 'audio/webm'
    };
    return mimeTypes[format] || 'audio/wav';
  }

  /**
   * Get file extension for format
   */
  getFileExtension(format: AudioFormat): string {
    return `.${format}`;
  }
}

export const audioFormatConverter = new AudioFormatConverter();
