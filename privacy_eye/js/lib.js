
function setConst(object, attributeName, attributeValue){
    Object.defineProperty(object, attributeName, {
        value: attributeValue,
        writable: false,
        configurable: false,
        enumerable : true,
    });
}

