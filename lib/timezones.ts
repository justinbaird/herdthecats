// Major cities with their IANA timezone identifiers
export interface TimezoneOption {
  city: string
  timezone: string
  label: string // Display format: "City (Timezone Code)"
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // North America
  { city: 'New York', timezone: 'America/New_York', label: 'New York (EST/EDT)' },
  { city: 'Los Angeles', timezone: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { city: 'Chicago', timezone: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { city: 'Denver', timezone: 'America/Denver', label: 'Denver (MST/MDT)' },
  { city: 'Phoenix', timezone: 'America/Phoenix', label: 'Phoenix (MST)' },
  { city: 'Toronto', timezone: 'America/Toronto', label: 'Toronto (EST/EDT)' },
  { city: 'Vancouver', timezone: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
  { city: 'Mexico City', timezone: 'America/Mexico_City', label: 'Mexico City (CST)' },
  
  // Europe
  { city: 'London', timezone: 'Europe/London', label: 'London (GMT/BST)' },
  { city: 'Paris', timezone: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { city: 'Berlin', timezone: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { city: 'Amsterdam', timezone: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { city: 'Rome', timezone: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { city: 'Madrid', timezone: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { city: 'Dublin', timezone: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
  { city: 'Stockholm', timezone: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
  { city: 'Oslo', timezone: 'Europe/Oslo', label: 'Oslo (CET/CEST)' },
  { city: 'Copenhagen', timezone: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)' },
  { city: 'Vienna', timezone: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { city: 'Prague', timezone: 'Europe/Prague', label: 'Prague (CET/CEST)' },
  { city: 'Warsaw', timezone: 'Europe/Warsaw', label: 'Warsaw (CET/CEST)' },
  { city: 'Athens', timezone: 'Europe/Athens', label: 'Athens (EET/EEST)' },
  { city: 'Istanbul', timezone: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  
  // Asia
  { city: 'Tokyo', timezone: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { city: 'Seoul', timezone: 'Asia/Seoul', label: 'Seoul (KST)' },
  { city: 'Beijing', timezone: 'Asia/Shanghai', label: 'Beijing (CST)' },
  { city: 'Shanghai', timezone: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { city: 'Hong Kong', timezone: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { city: 'Singapore', timezone: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { city: 'Bangkok', timezone: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { city: 'Mumbai', timezone: 'Asia/Kolkata', label: 'Mumbai (IST)' },
  { city: 'Delhi', timezone: 'Asia/Kolkata', label: 'Delhi (IST)' },
  { city: 'Dubai', timezone: 'Asia/Dubai', label: 'Dubai (GST)' },
  { city: 'Tel Aviv', timezone: 'Asia/Jerusalem', label: 'Tel Aviv (IST)' },
  
  // Australia & Oceania
  { city: 'Sydney', timezone: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { city: 'Melbourne', timezone: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { city: 'Brisbane', timezone: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { city: 'Perth', timezone: 'Australia/Perth', label: 'Perth (AWST)' },
  { city: 'Auckland', timezone: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  
  // South America
  { city: 'São Paulo', timezone: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { city: 'Rio de Janeiro', timezone: 'America/Sao_Paulo', label: 'Rio de Janeiro (BRT)' },
  { city: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { city: 'Santiago', timezone: 'America/Santiago', label: 'Santiago (CLT)' },
  { city: 'Lima', timezone: 'America/Lima', label: 'Lima (PET)' },
  
  // Africa
  { city: 'Cape Town', timezone: 'Africa/Johannesburg', label: 'Cape Town (SAST)' },
  { city: 'Lagos', timezone: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { city: 'Cairo', timezone: 'Africa/Cairo', label: 'Cairo (EET)' },
]

// Helper function to get timezone code (short format)
export function getTimezoneCode(timezone: string): string {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const date = new Date()
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'short',
      })
      const parts = formatter.formatToParts(date)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value
      if (timeZoneName) return timeZoneName
    }
    // Fallback: extract from IANA timezone string
    // e.g., "America/New_York" -> "EST/EDT" (approximate)
    const parts = timezone.split('/')
    return parts[parts.length - 1]?.replace(/_/g, ' ') || timezone
  } catch {
    // Final fallback
    const parts = timezone.split('/')
    return parts[parts.length - 1]?.replace(/_/g, ' ') || timezone
  }
}

// Helper function to format timezone display
export function formatTimezoneDisplay(city: string | null, timezone: string | null): string {
  if (!city || !timezone) return ''
  try {
    const code = getTimezoneCode(timezone)
    return `${city} (${code})`
  } catch {
    return `${city} (${timezone.split('/').pop() || timezone})`
  }
}

