import { expect, test } from "vitest";

// A simple test to make sure everything is configured correctly
test("Math.sqrt()", () => {
  expect(Math.sqrt(4)).toBe(2);
  expect(Math.sqrt(144)).toBe(12);
});

test("Adding", () => {
  expect(2+3).toBe(5);
})
