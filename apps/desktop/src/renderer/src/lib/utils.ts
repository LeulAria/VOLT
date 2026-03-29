import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Truncate string to max length */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/** Get file extension from path */
export function getExtension(filePath: string): string {
  return filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
}

/** Get filename from path */
export function getFilename(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Clamp number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
