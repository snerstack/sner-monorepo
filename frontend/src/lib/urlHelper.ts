import { encodeRFC3986URIComponent } from '@/lib/storage'

/**
 * Build a backend URL from a route path and optional query params.
 *
 * `params` is encoded with the sner-strict RFC3986 encoder (see toQueryString).
 * Empty params (`{}` / empty URLSearchParams / undefined) produce no trailing '?'.
 */
export const urlFor = (route_path: string, params?: URLSearchParams | Record<string, string>): string => {
    if (!params) return route_path;
    if (params instanceof URLSearchParams) return route_path + toQueryString(params);

    return route_path + toQueryString(new URLSearchParams(params));
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
