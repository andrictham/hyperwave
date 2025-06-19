import { Dispatch, SetStateAction, useEffect, useState } from "react";

/**
 * React hook to persist a string in localStorage.
 *
 * @param key - localStorage key
 * @param defaultValue - value used if nothing is stored
 * @returns stateful value and setter
 */
export function useLocalStorageString(
  key: string,
  defaultValue = "",
): [string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore write errors
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * React hook to persist a boolean flag in localStorage.
 *
 * Stored values are serialized as "true" or "false" strings.
 *
 * @param key - localStorage key
 * @param defaultValue - value used if nothing is stored
 * @returns stateful value and setter
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue = false,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return stored === "true";
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "true" : "false");
    } catch {
      // Ignore write errors
    }
  }, [key, value]);

  return [value, setValue];
}
