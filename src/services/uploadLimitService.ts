
export class UploadLimitService {
  static getUploadLimit(plan: string): number {
    const limits = {
      'free': 10, // 10 MB
      'pro': 25,  // 25 MB  
      'premium': 100 // 100 MB
    };
    return limits[plan as keyof typeof limits] || 10;
  }

  static validateFileSize(file: File, plan: string): { valid: boolean; error?: string } {
    const maxSizeMB = this.getUploadLimit(plan);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit for ${plan} plan`
      };
    }
    
    return { valid: true };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
