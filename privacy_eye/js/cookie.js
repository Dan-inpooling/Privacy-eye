/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function cookieParse(str, options) {
    if (typeof str !== 'string') {
        throw new TypeError('argument str must be a string');
    }

    var obj = {}
    var opt = options || {};
    var pairs = str.split(pairSplitRegExp);
    var dec = opt.decode || decode;

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var eq_idx = pair.indexOf('=');

        // skip things that don't look like key=value
        if (eq_idx < 0) {
            continue;
        }

        var key = pair.substr(0, eq_idx).trim()
        var val = pair.substr(++eq_idx, pair.length).trim();

        // quoted values
        if ('"' == val[0]) {
            val = val.slice(1, -1);
        }

        // only assign once
        if (undefined == obj[key]) {
            obj[key] = tryDecode(val, dec);
        }
    }

    return obj;
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
    try {
        return decode(str);
    } catch (e) {
        return str;
    }
}


/**
 * Information on the expiration time of a cookie.
 * State can be :
 * - max-age in seconds
 * - session (max-age == 0)
 * - to delete (max-age negative)
 * - no cookie (max-age === undefined)
 */
class CookieExpiration {


    static createMaxAge(maxAge){
        if(isNaN(maxAge))
            throw `[${maxAge}] is not a number`;
        if(maxAge === 0)
            return CookieExpiration.cookieSession;
        if(maxAge < 0)
            return CookieExpiration.cookieDelete;
        return new CookieExpiration(maxAge);
    }

    static get cookieSession(){
        return CookieExpiration._COOKIE_SESSION_OBJECT;
    }

    static get cookieDelete(){
        return CookieExpiration._COOKIE_DELETE_OBJECT;
    }

    static get cookieNotExists(){
        return CookieExpiration._COOKIE_NOT_EXISTS_OBJECT;
    }

    /**
     * Contain the content of a tab
     */
    constructor(maxAge) {
        this.maxAge = maxAge;
    }

    compare(otherCookie){
        if(this.maxAge === otherCookie.maxAge){
            return 0;
        }

        if(this.maxAge === null ||
            (otherCookie.maxAge !== null && this.maxAge < otherCookie.maxAge)){
            return -1;
        }

        return 1;
    }

    max(otherCookie){
        let comparison = this.compare(otherCookie);
        if(comparison === 0 || comparison === 1){
            return this;
        }

        return otherCookie;
    }

    get status(){
        if(this.maxAge === 0)
            return 'SESSION';
        if(this.maxAge === -1)
            return 'DELETE';
        if(this.maxAge === null)
            return 'NO_COOKIE';
        return 'MAX_AGE';
    }

    get humanized(){
        let status = this.status;
        if(status === 'MAX_AGE')
            return moment.duration(this.maxAge, 'seconds').humanize();
        if(status === 'SESSION')
            return 'Current Session';
        if(status === 'DELETE')
            return 'Too short to live';
        if(status === 'NO_COOKIE')
            return 'Not set';
        // TODO : put exception here
        return 'WHAT ???'
    }

    get isThreateaning(){
        return this.status === 'MAX_AGE' && this.maxAge > CookieExpiration._NOT_THREATENING_COOKIE_AGE;
    }

}

setConst(CookieExpiration, '_ONE_HOUR', 60 * 60);
setConst(CookieExpiration, '_FIVE_MINUTES', 60 * 5);
setConst(CookieExpiration, '_NOT_THREATENING_COOKIE_AGE', 24 * CookieExpiration._ONE_HOUR + CookieExpiration._FIVE_MINUTES);
setConst(CookieExpiration, '_COOKIE_SESSION_OBJECT', new CookieExpiration(0));
setConst(CookieExpiration, '_COOKIE_DELETE_OBJECT', new CookieExpiration(-1));
setConst(CookieExpiration, '_COOKIE_NOT_EXISTS_OBJECT', new CookieExpiration(null));


function getCookieExpiration(cookieValue) {
    //Return max age in seconds
    if (!cookieValue) {
        return CookieExpiration.cookieNotExists;
    }

    let parseResult = cookieParse(cookieValue.toLowerCase());

    if ('max-age' in parseResult) {
        let res = parseInt(parseResult['max-age']);
        return CookieExpiration.createMaxAge(res);
    }

    if ('expire' in parseResult) {
        // date is in milliseconds
        let res = Math.round((Date.parse(parseResult['expire']) - Date.now()) / 1000);
        return CookieExpiration.createMaxAge(res);
    }

    return CookieExpiration.cookieSession;
}


function getCookieDomain(cookieValue) {
    return [];
}