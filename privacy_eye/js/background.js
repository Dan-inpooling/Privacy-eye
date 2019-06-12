


function isNumber(n){
    return typeof n == 'number';
}

function extractHostname(url) {
    return tldjs.getDomain(url);
};


let max = function (v1, v2) {
    if (v2 === null || v2 === undefined) {
        return v1;
    }
    if (v1 === null || v1 === undefined) {
        return v2;
    }
    if (v1 > v2) {
        return v1;
    }
    return v2;
};


let headerHave = function (headers, name) {
    for (header of headers) {
        // if (header.name === 'set-cookie' || header.name === 'Cookie') {
        if (header.name === name) {
            return true;
        }
    }
    return false;
};

let readSendCookies = function (headers) {
    for (header of headers) {
        if (header.name === 'Cookie') {
            return true;
        }
    }
    return false;
};



class TabInfo {
    /**
     * Contain the content of a tab
     */
    constructor(tabId, url) {
        this.tabId = tabId;
        this.hostname = extractHostname(url);
        console.log(`New tab : ${url} <= ${tabId} ${extractHostname(url)}`);
        this.cookiesMaxAge = {};

        this.refreshHostname();
        this.updateBadge();
    }

    addReceivedMessage(url, headers) {
        /**
         * Look for new set of cookies
         * Return True if needs to update badge, False otherwise
         */

            // Parse the cookies
        let curCookieExpiration = CookieExpiration.cookieNotExists;
        for (let header of headers) {
            if (header.name.toLowerCase() === 'set-cookie') {
                curCookieExpiration = curCookieExpiration.max(getCookieExpiration(header.value));
                console.log(url, '=>', header.name, header.value);
            }
        }

        // console.log('Cookie set : ', url, curCookieExpiration);

        const hostname = extractHostname(url);
        const previousCookieExpiration = this.cookiesMaxAge[hostname] || CookieExpiration.cookieNotExists;
        const needUpdateBadge = !(hostname in this.cookiesMaxAge);

        this.cookiesMaxAge[hostname] = previousCookieExpiration.max(curCookieExpiration);

        if (needUpdateBadge) {
            console.log(`${this.tabId} > ${this.hostname} > ${hostname} > ${curCookieExpiration.humanized}`);
        }

        this.refreshHostname();

        if(needUpdateBadge){
            this.updateBadge();
        }
        return needUpdateBadge;
    }

    refreshHostname(){
        if (this.hostname === null && this.tabId !== -1) {
            // try to refresh the tab hostname
            // This can happen if there is a request behind the scene from another tab
            // And we haven't had the tabs.onUpdated event yet
            chrome.tabs.get(this.tabId, (tab) => {
                if(tab && tab.url) {
                    this.hostname = this.hostname || extractHostname(tab.url);
                }
            });
        }
    }


    mergeWith(otherTabInfo) {
        for (let hostname in otherTabInfo.cookiesMaxAge) {
            this.cookiesMaxAge[hostname] = max(this.cookiesMaxAge[hostname], otherTabInfo[hostname]);
        }
        this.hostname = otherTabInfo.hostname;
    }

    isSameHost(url) {
        return this.hostname == extractHostname(url);
    }

    countCookies() {
        let res = 0;
        for (let hostname in this.cookiesMaxAge) {
            res += 1;
            // if(this.cookiesMaxAge[hostname].isThreateaning) {
            //     res += 1;
            // }
        }
        return res;
    }

    updateBadge(){
        let text = '' + this.countCookies();
        try {
            chrome.browserAction.setBadgeText({tabId: this.tabId, text});
        } catch (err) {
        }
    }

}


class TabManagement {

    constructor() {
        this.tabs = {};
    }

    _processTabId(tabId){
        if(isNumber(tabId))
            return tabId
        return parseInt(tabId);
    }

    exists(tabId){
        tabId = this._processTabId(tabId);
        return tabId in this.tabs;
    }

    getTab(tabId){
        tabId = this._processTabId(tabId);
        if (!this.exists(tabId)) {
            console.log(`New tab ${tabId}`);
            this.tabs[tabId] = new TabInfo(tabId, null);
        }
        return this.tabs[tabId];
    }

    setTabUrl(tabId, url){
        tabId = this._processTabId(tabId);

        if(this.exists(tabId) && this.getTab(tabId).isSameHost(url))
            return false;
        this.tabs[tabId] = new TabInfo(tabId, url);
        return true;
    }

    deleteTab(tabId){
        tabId = this._processTabId(tabId);
        console.log(`Removing tab ${tabId}`);
        if (this.exists(tabId)) {
            delete this.tabs[tabId];
        }
    }

}

let tabManagement = undefined;

function initPrivacyEye(){
    tabManagement = new TabManagement();
    window.tabManagement = tabManagement; // To be accesible by popup.js
    // const sites = {};

    //Register a request from a tab
    const requestHandle = function (tabId, url, headers) {
        let curTab = tabManagement.getTab(tabId);
        let needUpdateBadge = curTab.addReceivedMessage(url, headers);
        if (needUpdateBadge) {
            curTab.updateBadge();
        }
    };

    /**
     * Listeners time
     */
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        tabManagement.setTabUrl(tabId, changeInfo.url || tab.url);
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        tabManagement.deleteTab(tabId);
    });

    let onHeaderReceivedCallback = function (details) {
        requestHandle(details.tabId, details.url, details.responseHeaders);
    };

    // Starting from Chrome 72 we need to have the extraHeaders to get the cookies
    // But older version will break if it's there, so having both
    try {
        chrome.webRequest.onHeadersReceived.addListener(
            onHeaderReceivedCallback,
            {urls: ['<all_urls>']},
            ['responseHeaders', 'extraHeaders']
        );
    } catch (error){
        chrome.webRequest.onHeadersReceived.addListener(
            onHeaderReceivedCallback,
            {urls: ['<all_urls>']},
            ['responseHeaders']
        );
    }


    console.log('added callback');
};

chrome.runtime.onInstalled.addListener(initPrivacyEye);
chrome.runtime.onStartup.addListener(initPrivacyEye);
