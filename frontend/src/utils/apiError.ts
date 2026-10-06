/**
 * Centralized API & Network Error Handler for TrustTrip
 * Converts technical HTTP, Axios, PostgREST, Supabase RLS, and network errors
 * into clear, actionable, user-friendly messages.
 */

export function getFriendlyErrorMessage(error: any, fallbackMessage = "Something went wrong. Please try again."): string {
  if (!error) return fallbackMessage;

  // 1. Network / Connection errors
  if (error.isAxiosError) {
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
        return "Connection timed out. Please check your internet connection and try again.";
      }
      return "Unable to connect to TrustTrip servers. Please check your internet connection or try again shortly.";
    }

    const status = error.response.status;
    const data = error.response.data;

    // Check if backend returned a specific human-readable message
    if (data && typeof data === "object") {
      const serverMsg = data.message || data.error || data.detail;
      if (typeof serverMsg === "string" && serverMsg.trim()) {
        const lower = serverMsg.toLowerCase();

        // Sanitize raw PostgREST / Supabase / Postgres error traces
        if (
          lower.includes("row-level security") ||
          lower.includes("pgrst") ||
          lower.includes("violates") ||
          lower.includes("duplicate key") ||
          lower.includes("syntax error") ||
          lower.includes("null value in column") ||
          lower.includes("foreign key") ||
          lower.includes("relation")
        ) {
          if (lower.includes("duplicate") || lower.includes("already exists") || lower.includes("unique")) {
            return "An account or entry with these details already exists.";
          }
          return "Action could not be completed. Please check your details and try again.";
        }

        // Return clean server message if it's safe and user-friendly
        if (!lower.includes("exception") && !lower.includes("traceback") && !lower.includes("internal server")) {
          return serverMsg;
        }
      }
    }

    // Status code specific fallbacks
    switch (status) {
      case 400:
        return "Please verify your input and try again.";
      case 401:
        return "Incorrect username or password. Please try again.";
      case 403:
        return "Access restricted. Your account may be suspended. Please contact TrustTrip support.";
      case 404:
        return "The requested information could not be found.";
      case 409:
        return "A record with these details already exists.";
      case 422:
        return "Unable to process the submitted information. Please check all fields.";
      case 429:
        return "Too many requests. Please wait a moment before trying again.";
      case 500:
      case 502:
      case 503:
        return "TrustTrip safety services are temporarily busy. Please try again in a few moments.";
      default:
        return fallbackMessage;
    }
  }

  // Generic Error object with message
  if (typeof error.message === "string" && error.message.trim()) {
    const lower = error.message.toLowerCase();
    if (lower.includes("network") || lower.includes("failed to fetch")) {
      return "Network connection unavailable. Please check your internet connection.";
    }
    if (lower.includes("location") || lower.includes("gps")) {
      return "Location services are unavailable. Please ensure GPS is enabled.";
    }
  }

  return fallbackMessage;
}
