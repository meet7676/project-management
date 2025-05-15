import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import toast from "react-hot-toast"

export const showToast = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
