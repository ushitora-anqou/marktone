import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock webextension-polyfill for test environment
vi.mock("webextension-polyfill", () => ({
  default: {
    runtime: {
      getURL: vi.fn(),
    },
    storage: {
      sync: {
        get: vi.fn(),
        set: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
    action: {
      setIcon: vi.fn().mockResolvedValue(undefined),
      onClicked: {
        addListener: vi.fn(),
      },
    },
  },
}));

afterEach(() => {
  cleanup();
});
