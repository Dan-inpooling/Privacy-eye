// TODO : one can add cookies through images. Look for that (and in css too)


let inIframe = function () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
};


let hostname = function (s) {
    return new URL(s).hostname;
};

let extractRootDomain = function (domain) {
    // FROM : https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
    var splitArr = domain.split('.'),
        arrLen = splitArr.length;

    //extracting the root domain here
    //if there is a subdomain
    if (arrLen > 2) {
        domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
        if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
            //this is using a ccTLD
            domain = splitArr[arrLen - 3] + '.' + domain;
        }
    }
    return domain;
};

let rootDomain = function (s) {
    if (s === null || s === undefined) {
        return null;
    }
    try {
        return extractRootDomain(hostname(s));
    } catch (err) {
        console.log('error with : ', s);
        return null;
    }
};

let isUrl = function (s) {
    try {
        new URL(s);
        return true;
    } catch (err) {
        return false;
    }
};


function union(setA, setB) {
    var _union = new Set(setA);
    for (var elem of setB) {
        _union.add(elem);
    }
    return _union;
}


// Look for elements that can call other elements :
// iframes => do the same thing recursively

function processDoc(doc) {
    let iframes = extractIframes(doc);
    let scripts = extractScripts(doc);
    return union(iframes, scripts);
}


// FROM https://regexr.com/3e6m0
const urlReg = /http(s)?:\/\/.(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/g;

function extractScripts(doc) {
    const res = new Set();
    // This get head and body
    const scripts_elements = doc.getElementsByTagName('script');
    for (let script of scripts_elements) {
        if (script.src !== '') {
            res.add(rootDomain(script.src));
        }

        if (script.innerText !== "") {
            let codeStr = script.innerText;
            let matches = codeStr.match(urlReg);
            if (matches !== null) {
                for (let match of matches) {
                    console.log(match);
                    if (isUrl(match)) {
                        res.add(rootDomain(match));
                    }
                }
            }
        }
    }
    return res;
}


function extractIframes(doc) {
    // Return a set
    let res = new Set();
    const iframes = doc.querySelectorAll('iframe');
    for (let iframe of iframes) {
        res.add(rootDomain(iframe.baseURI));
    }
    return res;
}


const content_res = Array.from(processDoc(document));


function new_data(data) {
    if (inIframe()) {
        let type = 'inpooling:hostnames';
        window.parent.postMessage({type, data}, '*');
    } else {
        console.log(data);
    }
}


window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
    if (event.data.type === 'inpooling:hostnames') {
        console.log('receiving event', event.data.data, event);
        new_data(event.data.data);
    }
}


// document.body.style.backgroundColor = "seashell";
new_data(content_res);

var url = (window.location !== window.parent.location)
    ? document.referrer
    : document.location.href;

console.log('referrer: ', url);



