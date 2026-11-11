function isHeaderElement(elem)
{
    return elem.nodeName.match(/^H\d+$/) && elem.textContent;
}

function getDOMElementsPreorderDFS(elem, pred)
{
    var result = [];
    if (pred(elem))
        result.push(elem);

    for ( const child of elem.children)
        result = result.concat(getDOMElementsPreorderDFS(child, pred));
    return result;
}

function anchorHeaderElements(headers)
{
    return Array.from(headers, function(elem, i)
    {
        const text = elem.textContent.trim().replace(/"/g, '\\"');
        const level = parseInt(elem.nodeName.substr(1));
        const anchor = `kiwix-toc-${i}`;

        const anchorElem = document.createElement("a");
        anchorElem.id = anchor;

        /* Mark header content with something we can reference. */
        elem.insertAdjacentElement("afterbegin", anchorElem);
        return { text, level, anchor };
    });
}

function getHeadersJSONStr()
{
    const headerInfo = { url: window.location.href.replace(location.hash,""), headers: [] };

    if (document.body !== undefined)
    {
        const headers = getDOMElementsPreorderDFS(document.body, isHeaderElement);
        headerInfo.headers = anchorHeaderElements(headers);
    }
    return JSON.stringify(headerInfo);
}

function isChineseCharacter(character)
{
    return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(character);
}

function getChineseWordAt(x, y)
{
    const range = document.caretRangeFromPoint(x, y);
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE)
        return "";

    const text = range.startContainer.textContent;
    let offset = Math.min(range.startOffset, text.length - 1);
    if (!isChineseCharacter(text[offset]) && offset > 0)
        --offset;
    if (!isChineseCharacter(text[offset]))
        return "";

    let start = offset;
    let end = offset + 1;
    while (start > 0 && isChineseCharacter(text[start - 1]))
        --start;
    while (end < text.length && isChineseCharacter(text[end]))
        ++end;
    return text.slice(start, end);
}

new QWebChannel(qt.webChannelTransport, function(channel) {
    var kiwixObj = channel.objects.kiwixChannelObj;
    let lookupTimer;
    let lookupWord = "";

    function requestLookup(word, x, y) {
        if (word === lookupWord)
            return;

        lookupWord = word;
        kiwixObj.selectedTextChanged(word, x, y);
    }

    function queueHoverLookup(event) {
        if (window.getSelection().toString().trim())
            return;

        clearTimeout(lookupTimer);
        const x = event.clientX;
        const y = event.clientY;
        lookupTimer = setTimeout(function() {
            requestLookup(getChineseWordAt(x, y), x, y);
        }, 400);
    }

    function queueSelectionLookup() {
        clearTimeout(lookupTimer);
        lookupTimer = setTimeout(function() {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (!text || selection.rangeCount === 0) {
                requestLookup("", 0, 0);
                return;
            }

            const rect = selection.getRangeAt(0).getBoundingClientRect();
            requestLookup(text, Math.round(rect.left), Math.round(rect.bottom));
        }, 150);
    }

    kiwixObj.sendHeadersJSONStr(getHeadersJSONStr());
    kiwixObj.navigationRequested.connect(function(url, anchor) {
        if (window.location.href.replace(location.hash,"") == url)
            document.getElementById(anchor).scrollIntoView();
    });

    document.addEventListener("mousemove", queueHoverLookup);
    document.addEventListener("mouseup", queueSelectionLookup);
    document.addEventListener("keyup", queueSelectionLookup);
    document.addEventListener("mouseout", function(event) {
        if (!event.relatedTarget) {
            clearTimeout(lookupTimer);
            requestLookup("", 0, 0);
        }
    });
});
