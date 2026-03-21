import { describe, it, expect } from "vitest";
import { getLevel } from "../services/levelService";

describe("getLevel", () => {
  it("returns Seed for 0 points", () => {
    expect(getLevel(0)).toBe("Seed");
  });

  it("returns Seed for 99 points", () => {
    expect(getLevel(99)).toBe("Seed");
  });

  it("returns Sprout for 100 points", () => {
    expect(getLevel(100)).toBe("Sprout");
  });

  it("returns Sprout for 299 points", () => {
    expect(getLevel(299)).toBe("Sprout");
  });

  it("returns Growing for 300 points", () => {
    expect(getLevel(300)).toBe("Growing");
  });

  it("returns Growing for 699 points", () => {
    expect(getLevel(699)).toBe("Growing");
  });

  it("returns Shipping for 700 points", () => {
    expect(getLevel(700)).toBe("Shipping");
  });

  it("returns Shipping for 1499 points", () => {
    expect(getLevel(1499)).toBe("Shipping");
  });

  it("returns Launched for 1500 points", () => {
    expect(getLevel(1500)).toBe("Launched");
  });

  it("returns Launched for 10000 points", () => {
    expect(getLevel(10000)).toBe("Launched");
  });
});
