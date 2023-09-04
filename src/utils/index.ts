export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const capitalizeArr = (strArr: string[]): string[] => {
  return strArr.map((str) => capitalize(str))
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
