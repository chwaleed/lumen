import { beforeEach, describe, expect, test } from "bun:test";
import { useThemeStore } from "@/lib/stores/theme-store";

const INITIAL_STATE = useThemeStore.getState();
const store = () => useThemeStore.getState();

beforeEach(() => {
  useThemeStore.setState(INITIAL_STATE, true);
});

describe("theme store", () => {
  test("starts light, so server and first client render agree", () => {
    expect(store().theme).toBe("light");
  });

  test("sets a theme directly", () => {
    store().setTheme("dark");

    expect(store().theme).toBe("dark");
  });

  test("toggles between the two themes", () => {
    store().toggleTheme();
    expect(store().theme).toBe("dark");

    store().toggleTheme();
    expect(store().theme).toBe("light");
  });

  // initializeTheme reads window; on the server it must be inert rather than throw.
  test("initializeTheme is a no-op without a window", () => {
    expect(typeof window).toBe("undefined");

    expect(() => store().initializeTheme()).not.toThrow();
    expect(store().theme).toBe("light");
  });
});
