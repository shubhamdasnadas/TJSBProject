<<<<<<< HEAD
import { type ClassValue, clsx } from "clsx";
=======
import { ClassValue, clsx } from "clsx";
>>>>>>> source/tablex
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
