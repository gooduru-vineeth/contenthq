import { describe, it, expect } from "vitest";
import { cn } from "../../lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const isHidden = false;
    expect(cn("base", isHidden && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts with last-wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });

  it("merges tailwind responsive variants correctly", () => {
    expect(cn("text-sm md:text-lg", "text-base")).toBe("md:text-lg text-base");
  });

  it("handles array inputs via clsx", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("handles object inputs via clsx", () => {
    expect(cn({ hidden: true, visible: false }, "base")).toBe("hidden base");
  });
});
