export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const unique = (arr: string[]): string[] => {
  return [...new Set(arr)]
}

export const escapeHtml = (unsafeString: string): string => {
  return unsafeString
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const base64ToArrayBuffer = (base64String: string): Uint8Array => {
  return Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0))
}

export const arrayBufferToBase64 = (buffer: Uint8Array) => {
  return btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
}
