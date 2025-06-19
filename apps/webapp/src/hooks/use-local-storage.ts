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
