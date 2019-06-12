function needUpdate() {
    let backgroundPage = chrome.extension.getBackgroundPage();

    chrome.tabs.getSelected(null, (tab) => {
        let tabId = tab.id;
        let tabObject = backgroundPage.tabManagement.getTab(tabId);

        if(tabObject === undefined){
            console.log('tab not present, peut mieux faire');
            return;
        }

        let data = [];
        for (let hostname in tabObject.cookiesMaxAge) {
            let cookieExpiration = tabObject.cookiesMaxAge[hostname];

            data.push({hostname, cookieExpiration});
        }

        data.sort((a, b) => {
            let res = - a.cookieExpiration.compare(b.cookieExpiration);
            if(res === 0)
                return a.hostname.localeCompare(b.hostname);
            return res;
        });

        let tableContent = data.map((e) => {
            let {hostname, cookieExpiration} = e;
            if(cookieExpiration.isThreateaning){
                return `<tr><td>${hostname}</td><td><div style="color: red;">${cookieExpiration.humanized}</div></td></tr>`;
            } else {
                return `<tr><td>${hostname}</td><td>${cookieExpiration.humanized}</td></tr>`;
            }
        }).join('\n');

        if(tableContent === ''){
            tableContent = `<tr><td colspan="2">NO DATA<br/>refresh the page</td></tr>`;
        }


        let content = `${tableContent}`;

        let previousContent = $('tbody').html();
        if (previousContent !== content) {
            $('tbody').html(content);
        }

    });

}


// chrome.runtime.onMessage.addListener(onReq);


needUpdate();

