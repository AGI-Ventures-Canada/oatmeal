import { describe, it, expect } from "bun:test"
import { haversineDistance, MAX_DISTANCE_KM } from "@/lib/utils/geo"

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0)
  })

  it("calculates distance between New York and Los Angeles", () => {
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437)
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4000)
  })

  it("calculates short distance correctly", () => {
    // Times Square to Central Park (~2.5 km)
    const distance = haversineDistance(40.758, -73.9855, 40.7829, -73.9654)
    expect(distance).toBeGreaterThan(2)
    expect(distance).toBeLessThan(4)
  })

  it("handles antipodal points", () => {
    // North pole to south pole
    const distance = haversineDistance(90, 0, -90, 0)
    expect(distance).toBeGreaterThan(20000)
    expect(distance).toBeLessThan(20100)
  })

  it("handles crossing the international date line", () => {
    const distance = haversineDistance(0, 179, 0, -179)
    expect(distance).toBeGreaterThan(200)
    expect(distance).toBeLessThan(250)
  })

  it("is symmetric", () => {
    const d1 = haversineDistance(40.7128, -74.006, 51.5074, -0.1278)
    const d2 = haversineDistance(51.5074, -0.1278, 40.7128, -74.006)
    expect(d1).toBeCloseTo(d2, 10)
  })
})

describe("MAX_DISTANCE_KM", () => {
  it("is 50 km", () => {
    expect(MAX_DISTANCE_KM).toBe(50)
  })
})
