// Comprehensive country list for international address forms
export interface Country {
  code: string // ISO 3166-1 alpha-2 code
  name: string
  postalCodeLabel: string // e.g., "ZIP Code", "Postal Code", "Postcode"
  stateLabel: string // e.g., "State", "Province", "Region", "County"
  hasState: boolean // Whether this country uses states/provinces
}

export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'AT', name: 'Austria', postalCodeLabel: 'Postal Code', stateLabel: 'State', hasState: false },
  { code: 'AU', name: 'Australia', postalCodeLabel: 'Postcode', stateLabel: 'State', hasState: true },
  { code: 'BD', name: 'Bangladesh', postalCodeLabel: 'Postal Code', stateLabel: 'Division', hasState: false },
  { code: 'BE', name: 'Belgium', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'BR', name: 'Brazil', postalCodeLabel: 'CEP', stateLabel: 'State', hasState: true },
  { code: 'CA', name: 'Canada', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: true },
  { code: 'CH', name: 'Switzerland', postalCodeLabel: 'Postal Code', stateLabel: 'Canton', hasState: false },
  { code: 'CL', name: 'Chile', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'CN', name: 'China', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'CO', name: 'Colombia', postalCodeLabel: 'Postal Code', stateLabel: 'Department', hasState: false },
  { code: 'CZ', name: 'Czech Republic', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'DE', name: 'Germany', postalCodeLabel: 'Postal Code', stateLabel: 'State', hasState: true },
  { code: 'DK', name: 'Denmark', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'EG', name: 'Egypt', postalCodeLabel: 'Postal Code', stateLabel: 'Governorate', hasState: false },
  { code: 'ES', name: 'Spain', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'FI', name: 'Finland', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'FR', name: 'France', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'GR', name: 'Greece', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'HU', name: 'Hungary', postalCodeLabel: 'Postal Code', stateLabel: 'County', hasState: false },
  { code: 'ID', name: 'Indonesia', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'IE', name: 'Ireland', postalCodeLabel: 'Eircode', stateLabel: 'County', hasState: false },
  { code: 'IL', name: 'Israel', postalCodeLabel: 'Postal Code', stateLabel: 'District', hasState: false },
  { code: 'IN', name: 'India', postalCodeLabel: 'PIN Code', stateLabel: 'State', hasState: true },
  { code: 'IT', name: 'Italy', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'JP', name: 'Japan', postalCodeLabel: 'Postal Code', stateLabel: 'Prefecture', hasState: false },
  { code: 'KE', name: 'Kenya', postalCodeLabel: 'Postal Code', stateLabel: 'County', hasState: false },
  { code: 'KR', name: 'South Korea', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'LK', name: 'Sri Lanka', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'MA', name: 'Morocco', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'MX', name: 'Mexico', postalCodeLabel: 'Postal Code', stateLabel: 'State', hasState: true },
  { code: 'MY', name: 'Malaysia', postalCodeLabel: 'Postal Code', stateLabel: 'State', hasState: false },
  { code: 'NG', name: 'Nigeria', postalCodeLabel: 'Postal Code', stateLabel: 'State', hasState: false },
  { code: 'NL', name: 'Netherlands', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'NO', name: 'Norway', postalCodeLabel: 'Postal Code', stateLabel: 'County', hasState: false },
  { code: 'NZ', name: 'New Zealand', postalCodeLabel: 'Postcode', stateLabel: 'Region', hasState: false },
  { code: 'PE', name: 'Peru', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'PH', name: 'Philippines', postalCodeLabel: 'ZIP Code', stateLabel: 'Province', hasState: false },
  { code: 'PK', name: 'Pakistan', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'PL', name: 'Poland', postalCodeLabel: 'Postal Code', stateLabel: 'Voivodeship', hasState: false },
  { code: 'PT', name: 'Portugal', postalCodeLabel: 'Postal Code', stateLabel: 'District', hasState: false },
  { code: 'RU', name: 'Russia', postalCodeLabel: 'Postal Code', stateLabel: 'Region', hasState: false },
  { code: 'SE', name: 'Sweden', postalCodeLabel: 'Postal Code', stateLabel: 'County', hasState: false },
  { code: 'SG', name: 'Singapore', postalCodeLabel: 'Postal Code', stateLabel: '', hasState: false },
  { code: 'TH', name: 'Thailand', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'AE', name: 'United Arab Emirates', postalCodeLabel: 'Postal Code', stateLabel: 'Emirate', hasState: false },
  { code: 'GB', name: 'United Kingdom', postalCodeLabel: 'Postcode', stateLabel: 'County', hasState: false },
  { code: 'US', name: 'United States', postalCodeLabel: 'ZIP Code', stateLabel: 'State', hasState: true },
  { code: 'VN', name: 'Vietnam', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
  { code: 'ZA', name: 'South Africa', postalCodeLabel: 'Postal Code', stateLabel: 'Province', hasState: false },
]

// Helper function to get country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}

// Helper function to get postal code label for a country
export function getPostalCodeLabel(countryCode: string): string {
  const country = getCountryByCode(countryCode)
  return country?.postalCodeLabel || 'Postal Code'
}

// Helper function to get state label for a country
export function getStateLabel(countryCode: string): string {
  const country = getCountryByCode(countryCode)
  return country?.stateLabel || 'State/Province'
}

// Helper function to check if country uses states
export function countryHasState(countryCode: string): boolean {
  const country = getCountryByCode(countryCode)
  return country?.hasState || false
}

