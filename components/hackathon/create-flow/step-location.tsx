"use client"

import { MapPin, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { cn } from "@/lib/utils"
import { normalizeUrlFieldValue, urlInputProps } from "@/lib/utils/url"

type LocationType = "in_person" | "virtual" | null

interface StepLocationProps {
  locationType: LocationType
  locationName: string | null
  locationUrl: string | null
  onChange: (data: {
    locationType: LocationType
    locationName: string | null
    locationUrl: string | null
  }) => void
}

export function StepLocation({ locationType, locationName, locationUrl, onChange }: StepLocationProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-4xl">
          Where will it take place?
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          In-person, virtual, or skip this for now.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant={locationType === "in_person" ? "default" : "outline"}
          className={cn("h-auto flex-1 flex-col gap-1 py-4")}
          onClick={() =>
            onChange({
              locationType: "in_person",
              locationName: locationName,
              locationUrl: null,
            })
          }
        >
          <MapPin className="size-5" />
          <span className="text-sm">In-person</span>
        </Button>
        <Button
          type="button"
          variant={locationType === "virtual" ? "default" : "outline"}
          className={cn("h-auto flex-1 flex-col gap-1 py-4")}
          onClick={() =>
            onChange({
              locationType: "virtual",
              locationName: null,
              locationUrl: locationUrl,
            })
          }
        >
          <Video className="size-5" />
          <span className="text-sm">Virtual</span>
        </Button>
      </div>

      {locationType === "in_person" && (
        <Field>
          <FieldLabel htmlFor="location-name">Venue</FieldLabel>
          <AddressAutocomplete
            id="location-name"
            value={locationName ?? ""}
            onChange={(val) =>
              onChange({ locationType, locationName: val || null, locationUrl })
            }
            placeholder="Search for a venue..."
          />
        </Field>
      )}

      {locationType === "virtual" && (
        <Field>
          <FieldLabel htmlFor="location-url">Meeting link</FieldLabel>
          <Input
            id="location-url"
            {...urlInputProps}
            placeholder="zoom.us/j/123456789"
            value={locationUrl ?? ""}
            onChange={(e) =>
              onChange({ locationType, locationName, locationUrl: e.target.value || null })
            }
            onBlur={() =>
              onChange({
                locationType,
                locationName,
                locationUrl: normalizeUrlFieldValue(locationUrl ?? "") || null,
              })
            }
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Field>
      )}
    </div>
  )
}
