import { supabase } from '@/integrations/supabase/client';

export interface VPNDetectionResult {
  isVPN: boolean;
  provider?: string;
  confidence: number;
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  ipAddress: string;
}

export interface LocationData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  ipAddress: string;
  isVPN: boolean;
  vpnProvider?: string;
}

export class VPNDetectionService {
  private static readonly VPN_CACHE_KEY = 'vpn_detection_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached VPN detection result
   */
  private static getCachedResult(ip: string): VPNDetectionResult | null {
    try {
      const cache = localStorage.getItem(this.VPN_CACHE_KEY);
      if (!cache) return null;

      const parsed = JSON.parse(cache);
      if (parsed.ip === ip && parsed.timestamp > Date.now() - this.CACHE_DURATION) {
        return parsed.result;
      }
    } catch (error) {
      console.warn('Error reading VPN cache:', error);
    }
    return null;
  }

  /**
   * Cache VPN detection result
   */
  private static setCachedResult(ip: string, result: VPNDetectionResult): void {
    try {
      const cache = {
        ip,
        result,
        timestamp: Date.now()
      };
      localStorage.setItem(this.VPN_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Error setting VPN cache:', error);
    }
  }

  /**
   * Detect VPN using multiple IP detection services
   */
  static async detectVPN(userIP?: string): Promise<VPNDetectionResult> {
    let detectedIP = userIP;
    
    // Get user's IP if not provided
    if (!detectedIP) {
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        detectedIP = ipData.ip;
      } catch (error) {
        console.warn('Failed to get IP:', error);
        // Fallback IP detection
        try {
          const fallback = await fetch('https://api.ipify.org?format=json');
          const data = await fallback.json();
          detectedIP = data.ip;
        } catch (e) {
          throw new Error('Unable to detect IP address');
        }
      }
    }

    // Check cache first
    const cached = this.getCachedResult(detectedIP);
    if (cached) {
      return cached;
    }

    // Detect location and VPN
    const result = await this.performVPNDetection(detectedIP);
    
    // Cache the result
    this.setCachedResult(detectedIP, result);
    
    // Save to database
    await this.saveVPNDetection(detectedIP, result);
    
    return result;
  }

  /**
   * Perform actual VPN detection using IP geolocation API
   */
  private static async performVPNDetection(ip: string): Promise<VPNDetectionResult> {
    try {
      // Use ipapi.co for detection (reliable and free)
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      
      if (!response.ok) {
        throw new Error('IP detection service unavailable');
      }
      
      const data = await response.json();
      
      // Check for VPN indicators
      const isVPN = this.detectVPNIndicators(data, ip);
      
      return {
        isVPN,
        provider: isVPN ? this.identifyVPNProvider(data) : undefined,
        confidence: isVPN ? 85 : 95,
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'XX',
        city: data.city,
        region: data.region,
        ipAddress: ip
      };
    } catch (error) {
      console.error('VPN detection failed:', error);
      
      // Fallback detection
      return {
        isVPN: false,
        confidence: 50,
        country: 'Unknown',
        countryCode: 'XX',
        ipAddress: ip
      };
    }
  }

  /**
   * Detect VPN indicators from IP data
   */
  private static detectVPNIndicators(data: any, ip: string): boolean {
    const vpnIndicators = [
      // Organization-based detection
      data.org?.toLowerCase().includes('vpn'),
      data.org?.toLowerCase().includes('proxy'),
      data.org?.toLowerCase().includes('hosting'),
      data.org?.toLowerCase().includes('datacenter'),
      data.org?.toLowerCase().includes('cloud'),
      
      // ISP-based detection
      data.isp?.toLowerCase().includes('vpn'),
      data.isp?.toLowerCase().includes('proxy'),
      
      // AS (Autonomous System) detection
      data.as?.toLowerCase().includes('vpn'),
      data.as?.toLowerCase().includes('hosting'),
      
      // Known VPN/hosting providers
      this.isKnownVPNProvider(data.org || '', data.isp || ''),
      
      // IP range analysis (simplified)
      this.isDatacenterIP(ip)
    ];

    return vpnIndicators.filter(Boolean).length >= 2;
  }

  /**
   * Check if provider is a known VPN/hosting service
   */
  private static isKnownVPNProvider(org: string, isp: string): boolean {
    const vpnProviders = [
      'nordvpn', 'expressvpn', 'surfshark', 'purevpn', 'hotspot shield',
      'tunnelbear', 'cyberghost', 'private internet access', 'windscribe',
      'protonvpn', 'mullvad', 'ipvanish', 'hide.me', 'zenmate', 'opera vpn',
      'aws', 'amazon', 'google cloud', 'microsoft azure', 'digitalocean',
      'linode', 'vultr', 'ovh', 'hetzner', 'contabo'
    ];
    
    const combined = `${org} ${isp}`.toLowerCase();
    return vpnProviders.some(provider => combined.includes(provider));
  }

  /**
   * Simple datacenter IP detection
   */
  private static isDatacenterIP(ip: string): boolean {
    // This is a simplified check - in production, you'd use a comprehensive database
    const datacenterRanges = [
      // Common datacenter/cloud IP ranges (simplified)
      '18.', '52.', '54.', '107.', '172.', '185.', '192.'
    ];
    
    return datacenterRanges.some(range => ip.startsWith(range));
  }

  /**
   * Identify VPN provider from data
   */
  private static identifyVPNProvider(data: any): string {
    const org = (data.org || '').toLowerCase();
    const isp = (data.isp || '').toLowerCase();
    const combined = `${org} ${isp}`;

    if (combined.includes('nordvpn')) return 'NordVPN';
    if (combined.includes('expressvpn')) return 'ExpressVPN';
    if (combined.includes('surfshark')) return 'Surfshark';
    if (combined.includes('aws') || combined.includes('amazon')) return 'AWS Cloud';
    if (combined.includes('google')) return 'Google Cloud';
    if (combined.includes('azure') || combined.includes('microsoft')) return 'Microsoft Azure';
    
    return 'Unknown VPN/Proxy';
  }

  /**
   * Save VPN detection result to database (disabled - table doesn't exist)
   */
  private static async saveVPNDetection(ip: string, result: VPNDetectionResult): Promise<void> {
    // Table doesn't exist in database, skip saving
    return;
  }

  /**
   * Save user location for authenticated users
   */
  static async saveUserLocation(userId: string, locationData: LocationData): Promise<void> {
    try {
      await supabase.from('user_locations').upsert({
        user_id: userId,
        ip_address: locationData.ipAddress,
        country_code: locationData.countryCode,
        country_name: locationData.country,
        city: locationData.city,
        region: locationData.region,
        is_vpn: locationData.isVPN,
        vpn_provider: locationData.vpnProvider,
        confidence_score: 95,
        last_checked_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    } catch (error) {
      console.error('Failed to save user location:', error);
    }
  }

  /**
   * Check if user's location is from India and not using VPN
   */
  static async validateIndianUser(): Promise<{
    isValid: boolean;
    isVPN: boolean;
    country: string;
    message: string;
  }> {
    try {
      const result = await this.detectVPN();
      
      const isIndian = result.countryCode === 'IN';
      const isVPN = result.isVPN;
      
      if (isVPN) {
        return {
          isValid: false,
          isVPN: true,
          country: result.country,
          message: 'VPN/Proxy detected. Please disable your VPN to access this service.'
        };
      }
      
      if (!isIndian) {
        return {
          isValid: false,
          isVPN: false,
          country: result.country,
          message: `This service is only available in India. Detected location: ${result.country}`
        };
      }
      
      return {
        isValid: true,
        isVPN: false,
        country: result.country,
        message: 'Welcome! Access granted from India.'
      };
    } catch (error) {
      return {
        isValid: false,
        isVPN: false,
        country: 'Unknown',
        message: 'Unable to verify location. Please try again.'
      };
    }
  }

  /**
   * Clear VPN detection cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.VPN_CACHE_KEY);
    } catch (error) {
      console.warn('Error clearing VPN cache:', error);
    }
  }
}