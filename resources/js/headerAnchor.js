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
    return { text: text.slice(start, end), cursorOffset: offset - start };
}

new QWebChannel(qt.webChannelTransport, function(channel) {
    var kiwixObj = channel.objects.kiwixChannelObj;
    let lookupTimer;
    let lookupKey = "";

    function requestLookup(text, cursorOffset, x, y) {
        const key = `${text}:${cursorOffset}`;
        if (key === lookupKey)
            return;

        lookupKey = key;
        kiwixObj.requestDictionaryLookup(text, x, y, cursorOffset);
    }

    function queueHoverLookup(event) {
        if (window.getSelection().toString().trim())
            return;

        clearTimeout(lookupTimer);
        const x = event.clientX;
        const y = event.clientY;
        lookupTimer = setTimeout(function() {
            const word = getChineseWordAt(x, y);
            requestLookup(word ? word.text : "", word ? word.cursorOffset : -1, x, y);
        }, 200);
    }

    function queueSelectionLookup() {
        clearTimeout(lookupTimer);
        lookupTimer = setTimeout(function() {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (!text || selection.rangeCount === 0) {
                requestLookup("", -1, 0, 0);
                return;
            }

            const rect = selection.getRangeAt(0).getBoundingClientRect();
            requestLookup(text, -1, Math.round(rect.left), Math.round(rect.bottom));
        }, 150);
    }

    function isChineseText(text) {
        return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(text);
    }

    function canSegmentNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(".kiwix-segment"))
            return false;

        return !parent.closest("script, style, textarea, input, select, option, pre, code");
    }

    function highlightNode(node, words) {
        if (!node.parentNode || words.join("") !== node.nodeValue)
            return;

        const fragment = document.createDocumentFragment();
        let colorIndex = 0;
        words.forEach(function(word) {
            if (isChineseText(word)) {
                const segment = document.createElement("span");
                segment.className = `kiwix-segment kiwix-segment-${colorIndex % 4}`;
                segment.textContent = word;
                fragment.appendChild(segment);
                ++colorIndex;
            } else {
                fragment.appendChild(document.createTextNode(word));
            }
        });
        node.parentNode.replaceChild(fragment, node);
    }

    function highlightChineseSegments() {
        const style = document.createElement("style");
        style.textContent =
            ".kiwix-segment { border-radius: 2px; padding: 1px 2px; }" +
            ".kiwix-segment-0 { background: #FFE08A; }" +
            ".kiwix-segment-1 { background: #A9E8FF; }" +
            ".kiwix-segment-2 { background: #C7F5B4; }" +
            ".kiwix-segment-3 { background: #F7C4E5; }";
        document.head.appendChild(style);

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                return isChineseText(node.nodeValue) && canSegmentNode(node)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });
        const nodes = [];
        while (walker.nextNode())
            nodes.push(walker.currentNode);

        function segmentNext() {
            const node = nodes.shift();
            if (!node)
                return;

            kiwixObj.segmentChineseText(node.nodeValue, function(result) {
                try {
                    highlightNode(node, JSON.parse(result));
                } catch (error) {
                    console.error("Unable to segment Chinese text:", error);
                }
                segmentNext();
            });
        }

        segmentNext();
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
            requestLookup("", -1, 0, 0);
        }
    });

    highlightChineseSegments();
});
