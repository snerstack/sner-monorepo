import { encodeRFC3986URIComponent } from '@/lib/sner/storage'

/**
 * Extracted routing helper.
 * 
 * Would allow to place relocation code window.location for HashRouter to the single place if necessary.
 * 
 *  * @param {string} route_path
 */
export const urlFor = (route_path: string): string => {
    // with HashRouter
    //return (
    //  window.location.href.includes("#") ?
    //  window.location.href.split("#")[0].replace(/\/$/, "") :
    //  ""
    //)

    return route_path;
}

/**
 * get querystring from URLSearchParams, using sner-strict url encoding
 */
export const toQueryString = (urlparams: URLSearchParams): string => {
  const params = Array.from(urlparams.entries())
    .map(([key, value]) => `${encodeRFC3986URIComponent(key)}=${encodeRFC3986URIComponent(value)}`)
    .join('&')
  return params ? '?' + params : ''
}
