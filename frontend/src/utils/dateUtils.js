/**
 * Formats any raw date string/timestamp into local time format (e.g. 12:02 PM IST).
 * Handles UTC strings without timezone designators cleanly and prevents 'Invalid Date'.
 */
export function formatTimestamp(rawDate) {
  if (!rawDate) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  try {
    let dateObj;
    if (typeof rawDate === 'string') {
      const str = rawDate.trim();
      if (str === 'Invalid Date') {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      if (!str.endsWith('Z') && !str.includes('+') && !str.includes('GMT')) {
        dateObj = new Date(str.replace(' ', 'T') + 'Z');
      } else {
        dateObj = new Date(str);
      }
    } else {
      dateObj = new Date(rawDate);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    return dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
