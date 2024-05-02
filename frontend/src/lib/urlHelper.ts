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