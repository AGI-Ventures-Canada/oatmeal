export type StructuredAddress = {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export function serializeAddress(address: StructuredAddress): string {
  return JSON.stringify(address)
}

export function parseAddress(raw: string): StructuredAddress | null {
  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.street === "string" &&
      typeof parsed.city === "string" &&
      typeof parsed.state === "string" &&
      typeof parsed.postalCode === "string" &&
      typeof parsed.country === "string"
    ) {
      return parsed as StructuredAddress
    }
    return null
  } catch {
    return null
  }
}

export function formatAddress(address: StructuredAddress): string {
  const cityLine = [address.city, address.state].filter(Boolean).join(", ")
  const cityPostal = [cityLine, address.postalCode].filter(Boolean).join(" ")
  const lines = [address.street, cityPostal, address.country]
  return lines.filter(Boolean).join("\n")
}

// Manually maintained — update when adding support for new countries.
export const COUNTRIES = [
  "United States",
  "Canada",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Bolivia",
  "Brazil",
  "Bulgaria",
  "Cambodia",
  "Cameroon",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Estonia",
  "Ethiopia",
  "Finland",
  "France",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Latvia",
  "Lebanon",
  "Lithuania",
  "Luxembourg",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Myanmar",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Panama",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Tanzania",
  "Thailand",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "Uruguay",
  "Venezuela",
  "Vietnam",
  "Zimbabwe",
] as const
