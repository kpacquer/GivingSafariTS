"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onWordChange = exports.onLetterChange = exports.onWordKey = exports.onLetterKey = exports.onLetterKeyDown = void 0;
var classUtil_1 = require("./classUtil");
var notes_1 = require("./notes");
var boilerplate_1 = require("./boilerplate");
var storage_1 = require("./storage");
/**
 * Any event stemming from key in this list should be ignored
 */
var ignoreKeys = [
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'OptionLeft', 'OptionRight', 'CapsLock', 'Backspace', 'Escape', 'Delete', 'Insert', 'NumLock', 'ScrollLock', 'Pause', 'PrintScreen',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16',
];
/**
 * The names of the back and forward arrow keys.
 * If RTL, swap these
 */
var ArrowPrior = 'ArrowLeft';
var ArrowNext = 'ArrowRight';
/**
 * The change in horizontal index that happens after a right arrow
 * If RTL, this should be -1
 */
var plusX = 1;
/**
 * todo: DOCUMENT THIS
 */
var priorInputValue = '';
/**
 * The input
 */
var keyDownTarget = null;
/**
 * Callback when a user pressed a keyboard key from any letter-input or word-input text field
 * @param event - A keyboard event
 */
function onLetterKeyDown(event) {
    var input = event.currentTarget;
    keyDownTarget = input;
    priorInputValue = input.value;
    var code = event.code;
    if (code == undefined || code == '') {
        code = event.key; // Mobile doesn't use code
    }
    var inpClass = (0, classUtil_1.hasClass)(input, 'word-input') ? 'word-input' : 'letter-input';
    var skipClass = (0, classUtil_1.hasClass)(input, 'word-input') ? 'word-non-input' : 'letter-non-input';
    var prior = null;
    if ((0, classUtil_1.hasClass)(input.parentNode, 'multiple-letter') || (0, classUtil_1.hasClass)(input, 'word-input')) {
        // Multi-character fields still want the ability to arrow between cells.
        // We need to look at the selection prior to the arrow's effect, 
        // to see if we're already at the edge.
        if (code == ArrowNext || code == 'Enter') {
            var s = input.selectionStart;
            var e = input.selectionEnd;
            if (s == e && e == input.value.length) {
                var next = findNextInput(input, plusX, 0, inpClass, skipClass);
                if (next != null) {
                    (0, classUtil_1.moveFocus)(next, 0);
                }
                event.preventDefault();
            }
        }
        else if (code == ArrowPrior) {
            var s = input.selectionStart;
            var e = input.selectionEnd;
            if (s == e && e == 0) {
                var prior_1 = findNextInput(input, -plusX, 0, inpClass, skipClass);
                if (prior_1 != null) {
                    (0, classUtil_1.moveFocus)(prior_1, prior_1.value.length);
                }
                event.preventDefault();
            }
        }
    }
    else {
        if (code == 'Backspace' || code == 'Space') {
            if (code == 'Space') {
                // Make sure user isn't just typing a space between words
                prior = (0, classUtil_1.findNextOfClass)(input, 'letter-input', null, -1);
                if (prior != null && (0, classUtil_1.hasClass)(prior, 'letter-non-input') && (0, classUtil_1.findNextOfClass)(prior, 'letter-input') == input) {
                    var lit = prior.getAttribute('data-literal');
                    if (lit == ' ' || lit == '¶') { // match any space-like things  (lit == '¤'?)
                        prior = (0, classUtil_1.findNextOfClass)(prior, 'letter-input', 'literal', -1);
                        if (prior != null && prior.value != '') {
                            // This looks much more like a simple space between words
                            event.preventDefault();
                            return;
                        }
                    }
                }
            }
            // Delete only deletes the current cell
            // Space deletes and moves forward
            prior = null;
            var dxDel = code == 'Backspace' ? -plusX : plusX;
            var dyDel = code == 'Backspace' ? -1 : 1;
            if (priorInputValue.length == 0) {
                var discoverRoot = (0, classUtil_1.findParentOfClass)(input, 'letter-grid-discover');
                if (discoverRoot != null) {
                    prior = (0, classUtil_1.findParentOfClass)(input, 'vertical')
                        ? findNextByPosition(discoverRoot, input, 0, dyDel, 'letter-input', 'letter-non-input')
                        : findNextByPosition(discoverRoot, input, dxDel, 0, 'letter-input', 'letter-non-input');
                }
                else {
                    prior = findNextOfClassGroup(input, 'letter-input', 'letter-non-input', 'text-input-group', dxDel);
                }
                ExtractFromInput(input);
                (0, classUtil_1.moveFocus)(prior);
                input = prior; // fall through
            }
            if (input != null && input.value.length > 0) {
                if (!(0, classUtil_1.hasClass)(input.parentNode, 'multiple-letter')) {
                    // Backspace should clear most cells
                    input.value = '';
                }
                else if (prior != null) {
                    // If backspacing across cells, into a multiple-letter cell, just remove the last character
                    // REVIEW: should this behavior also apply when starting in multi-letter cells?
                    if (dyDel < 0) {
                        input.value = input.value.substring(0, input.value.length - 1);
                    }
                    else {
                        input.value = input.value.substring(1);
                    }
                }
            }
            afterInputUpdate(input);
            event.preventDefault();
            return;
        }
        if (event.key.length == 1) {
            if (event.key == '`') {
                (0, notes_1.toggleHighlight)(input);
            }
            if (!event.ctrlKey && !event.altKey && event.key.match(/[a-z0-9]/i)) {
                input.value = event.key;
                afterInputUpdate(input);
            }
            event.preventDefault();
            return;
        }
        // Single-character fields always go to the next field
        if (code == ArrowNext) {
            (0, classUtil_1.moveFocus)(findNextInput(input, plusX, 0, inpClass, skipClass));
            event.preventDefault();
        }
        else if (code == ArrowPrior) {
            (0, classUtil_1.moveFocus)(findNextInput(input, -plusX, 0, inpClass, skipClass));
            event.preventDefault();
        }
    }
    if (code == 'ArrowUp' || code == 'PageUp') {
        (0, classUtil_1.moveFocus)(findNextInput(input, 0, -1, inpClass, skipClass));
        event.preventDefault();
        return;
    }
    else if (code == 'ArrowDown' || code == 'PageDown') {
        (0, classUtil_1.moveFocus)(findNextInput(input, 0, 1, inpClass, skipClass));
        event.preventDefault();
        return;
    }
    if ((0, classUtil_1.findParentOfClass)(input, 'digit-only')) {
        if (event.key.length == 1 && (event.key >= 'A' && event.key < 'Z' || event.key > 'a' && event.key < 'z')) {
            // Completely disallow (English) alpha characters. Punctuation still ok.
            event.preventDefault();
        }
    }
}
exports.onLetterKeyDown = onLetterKeyDown;
/**
 * Callback when a user releases a keyboard key from any letter-input or word-input text field
 * @param event - A keyboard event
 */
function onLetterKey(event) {
    if (event.isComposing) {
        return; // Don't interfere with IMEs
    }
    if ((0, boilerplate_1.isDebug)()) {
        alert('code:' + event.code + ', key:' + event.key);
    }
    var input = event.currentTarget;
    if (input != keyDownTarget) {
        keyDownTarget = null;
        // key-down likely caused a navigation
        return;
    }
    keyDownTarget = null;
    var code = event.code;
    if (code == undefined || code == '') {
        code = event.key; // Mobile doesn't use code
    }
    if (code == 'Enter') {
        code = event.shiftKey ? 'ArrowUp' : 'ArrowDown';
    }
    if (code == 'Tab') { // includes shift-Tab
        // Do nothing. User is just passing through
        // TODO: Add special-case exception to wrap around from end back to start
        return;
    }
    else if (code == 'Home') {
        (0, classUtil_1.moveFocus)((0, classUtil_1.findEndInContainer)(input, 'letter-input', 'letter-non-input', 'letter-cell-block', 0));
        return;
    }
    else if (code == 'End') {
        (0, classUtil_1.moveFocus)((0, classUtil_1.findEndInContainer)(input, 'letter-input', 'letter-non-input', 'letter-cell-block', -1));
        return;
    }
    else if (code == 'Backquote') {
        return; // Highlight already handled in key down
    }
    if (input.value.length == 0 || ignoreKeys.indexOf(code) >= 0) {
        // Don't move focus if nothing was typed
        return;
    }
    if (input.value.length === 1 && !input.value.match(/[a-z0-9]/i)) {
        // Spaces and punctuation might be intentional, but if they follow a matching literal, they probably aren't.
        // NOTE: this tends to fail when the punctuation is stylized like smart quotes or minus instead of dash.
        var prior = (0, classUtil_1.findNextOfClass)(input, 'letter-input', null, -1);
        if ((0, classUtil_1.hasClass)(prior, 'letter-non-input') && (0, classUtil_1.findNextOfClass)(prior, 'letter-input') == input) {
            if (prior.getAttribute('data-literal') == input.value) {
                input.value = ''; // abort this space
                return;
            }
        }
    }
    afterInputUpdate(input);
}
exports.onLetterKey = onLetterKey;
/**
 * Re-scan for extractions
 * @param input The input which just changed
 */
function afterInputUpdate(input) {
    var text = input.value;
    if ((0, classUtil_1.hasClass)(input.parentNode, 'lower-case')) {
        text = text.toLocaleLowerCase();
    }
    else if (!(0, classUtil_1.hasClass)(input.parentNode, 'any-case')) {
        text = text.toUpperCase();
    }
    var overflow = '';
    var nextInput = (0, classUtil_1.findParentOfClass)(input, 'vertical')
        ? findNextInput(input, 0, 1, 'letter-input', 'letter-non-input')
        : findNextInput(input, plusX, 0, 'letter-input', 'letter-non-input');
    var multiLetter = (0, classUtil_1.hasClass)(input.parentNode, 'multiple-letter');
    if (!multiLetter && text.length > 1) {
        overflow = text.substring(1);
        text = text.substring(0, 1);
    }
    input.value = text;
    ExtractFromInput(input);
    if (!multiLetter) {
        if (nextInput != null) {
            if (overflow.length > 0 && nextInput.value.length == 0) {
                // Insert our overflow into the next cell
                nextInput.value = overflow;
                (0, classUtil_1.moveFocus)(nextInput);
                // Then do the same post-processing as this cell
                afterInputUpdate(nextInput);
            }
            else if (text.length > 0) {
                // Just move the focus
                (0, classUtil_1.moveFocus)(nextInput);
            }
        }
    }
    else {
        var spacing = (text.length - 1) * 0.05;
        input.style.letterSpacing = -spacing + 'em';
        input.style.paddingRight = (2 * spacing) + 'em';
        //var rotate = text.length <= 2 ? 0 : (text.length * 5);
        //input.style.transform = 'rotate(' + rotate + 'deg)';
    }
    (0, storage_1.saveLetterLocally)(input);
}
/**
 * Extract contents of an extract-flagged input
 * @param input an input field
 */
function ExtractFromInput(input) {
    var extractedId = (0, classUtil_1.getOptionalStyle)(input, 'data-extracted-id', null, 'extracted-');
    if ((0, classUtil_1.hasClass)(input.parentNode, 'extract')) {
        UpdateExtraction(extractedId);
    }
    else if ((0, classUtil_1.hasClass)(input.parentNode, 'extractor')) { // can also be numbered
        UpdateExtractionSource(input);
    }
    else if ((0, classUtil_1.hasClass)(input.parentNode, 'numbered')) {
        UpdateNumbered(extractedId);
    }
}
/**
 * Update an extraction destination
 * @param extractedId The id of an element that collects extractions
 */
function UpdateExtraction(extractedId) {
    var extracted = document.getElementById(extractedId || 'extracted');
    if (extracted == null) {
        return;
    }
    if (extracted.getAttribute('data-number-pattern') != null || extracted.getAttribute('data-letter-pattern') != null) {
        UpdateNumbered(extractedId);
        return;
    }
    var inputs = document.getElementsByClassName('extract-input');
    var extraction = '';
    for (var i = 0; i < inputs.length; i++) {
        if (extractedId != null && (0, classUtil_1.getOptionalStyle)(inputs[i], 'data-extracted-id', null, 'extracted-') != extractedId) {
            continue;
        }
        var inp = inputs[i];
        var letter = inp.value || '';
        letter = letter.trim();
        if (letter.length == 0) {
            extraction += '_';
        }
        else {
            extraction += letter;
        }
    }
    ApplyExtraction(extraction, extracted);
}
/**
 * Check whether a collection of extracted text is more than blanks and underlines
 * @param text Generated extraction, which may still contain underlines for missing parts
 * @returns true if text contains anything other than spaces and underlines
 */
function ExtractionIsInteresting(text) {
    return text.length > 0 && text.match(/[^_]/) != null;
}
/**
 * Update an extraction area with new text
 * @param text The current extraction
 * @param dest The container for the extraction. Can be a div or an input
 */
function ApplyExtraction(text, dest) {
    if ((0, classUtil_1.hasClass)(dest, 'lower-case')) {
        text = text.toLocaleLowerCase();
    }
    else if ((0, classUtil_1.hasClass)(dest, 'all-caps')) {
        text = text.toLocaleUpperCase();
    }
    var destInp = dest;
    var current = (destInp === null) ? dest.innerText : destInp.value;
    if (!ExtractionIsInteresting(text) && !ExtractionIsInteresting(current)) {
        return;
    }
    if (!ExtractionIsInteresting(text) && ExtractionIsInteresting(current)) {
        text = '';
    }
    if (dest.tagName != 'INPUT') {
        dest.innerText = text;
    }
    else {
        destInp.value = text;
    }
}
/**
 * Update an extraction that uses numbered indicators
 * @param extractedId The id of an extraction area
 */
function UpdateNumbered(extractedId) {
    var inputs = document.getElementsByClassName('extract-input');
    for (var i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        var index = inputs[i].getAttribute('data-number');
        var extractCell = document.getElementById('extractor-' + index);
        var letter = inp.value || '';
        letter = letter.trim();
        if (letter.length > 0 || extractCell.value.length > 0) {
            extractCell.value = letter;
        }
    }
}
/**
 *
 * @param input
 * @returns
 */
function UpdateExtractionSource(input) {
    //var extractedId = getOptionalStyle(input, 'data-extracted-id', null, 'extracted-');
    var extractors = document.getElementsByClassName('extractor-input');
    var index = (0, classUtil_1.getOptionalStyle)(input.parentNode, 'data-number');
    if (index === null) {
        for (var i = 0; i < extractors.length; i++) {
            if (extractors[i] == input) {
                index = "" + (i + 1); // start at 1
                break;
            }
        }
    }
    if (index === null) {
        return;
    }
    var sources = document.getElementsByClassName('extract-input');
    for (var i = 0; i < sources.length; i++) {
        var src = sources[i];
        var dataNumber = (0, classUtil_1.getOptionalStyle)(src, 'data-number');
        if (dataNumber != null && dataNumber == index) {
            src.value = input.value;
            return;
        }
    }
}
/**
 * User has typed in a word-entry field
 * @param event A Keyboard event
 */
function onWordKey(event) {
    if (event.isComposing) {
        return; // Don't interfere with IMEs
    }
    var input = event.currentTarget;
    if ((0, classUtil_1.getOptionalStyle)(input, 'data-extract-index') != null) {
        var extractId = (0, classUtil_1.getOptionalStyle)(input, 'data-extracted-id', null, 'extracted-');
        UpdateWordExtraction(extractId);
    }
    var code = event.code;
    if (code == 'Enter') {
        code = event.shiftKey ? 'ArrowUp' : 'ArrowDown';
    }
    if (code == 'PageUp') {
        (0, classUtil_1.moveFocus)((0, classUtil_1.findNextOfClass)(input, 'word-input', null, -1));
        return;
    }
    else if (code == 'Enter' || code == 'PageDown') {
        (0, classUtil_1.moveFocus)((0, classUtil_1.findNextOfClass)(input, 'word-input', null));
        return;
    }
}
exports.onWordKey = onWordKey;
/**
 * Update extractions that come from word input
 * @param extractedId The ID of an extraction area
 */
function UpdateWordExtraction(extractedId) {
    var extracted = document.getElementById(extractedId || 'extracted');
    if (extracted == null) {
        return;
    }
    var inputs = document.getElementsByClassName('word-input');
    var extraction = '';
    var partial = false;
    for (var i = 0; i < inputs.length; i++) {
        if (extractedId != null && (0, classUtil_1.getOptionalStyle)(inputs[i], 'data-extracted-id', null, 'extracted-') != extractedId) {
            continue;
        }
        var index = (0, classUtil_1.getOptionalStyle)(inputs[i], 'data-extract-index', '');
        var indeces = index.split(' ');
        for (var j = 0; j < indeces.length; j++) {
            var extractIndex = parseInt(indeces[j]);
            if (extractIndex > 0) { // indeces start at 1
                var inp = inputs[i];
                var letter = inp.value.length >= extractIndex ? inp.value[extractIndex - 1] : '_';
                extraction += letter;
                partial = partial || (letter != '_');
            }
        }
    }
    ApplyExtraction(extraction, extracted);
}
/**
 * Callback when user has changed the text in a letter-input
 * @param event A keyboard event
 */
function onLetterChange(event) {
    if (event.isComposing) {
        return; // Don't interfere with IMEs
    }
    var input = (0, classUtil_1.findParentOfClass)(event.currentTarget, 'letter-input');
    (0, storage_1.saveLetterLocally)(input);
}
exports.onLetterChange = onLetterChange;
/**
 * Callback when user has changed the text in a word-input
 * @param event A keyboard event
 */
function onWordChange(event) {
    if (event.isComposing) {
        return; // Don't interfere with IMEs
    }
    var input = (0, classUtil_1.findParentOfClass)(event.currentTarget, 'word-input');
    (0, storage_1.saveWordLocally)(input);
}
exports.onWordChange = onWordChange;
/**
 * Find the input that the user likely means when navigating from start in a given x,y direction
 * @param start - The current input
 * @param dx - A horizontal direction to look
 * @param dy - A vertical direction to look
 * @param cls - a class to look for
 * @param clsSkip - a class to skip
 * @returns
 */
function findNextInput(start, dx, dy, cls, clsSkip) {
    var root2d = (0, classUtil_1.findParentOfClass)(start, 'letter-grid-2d');
    var find = null;
    if (root2d != null) {
        find = findNext2dInput(root2d, start, dx, dy, cls, clsSkip);
        if (find != null) {
            return find;
        }
    }
    var discoverRoot = (0, classUtil_1.findParentOfClass)(start, 'letter-grid-discover');
    if (discoverRoot != null) {
        find = findNextByPosition(discoverRoot, start, dx, dy, cls, clsSkip);
        if (find != null) {
            return find;
        }
    }
    if (dy < 0) {
        find = (0, classUtil_1.findInNextContainer)(start, cls, clsSkip, 'letter-cell-block', -1);
        if (find != null) {
            return find;
        }
    }
    if (dy > 0) {
        find = (0, classUtil_1.findInNextContainer)(start, cls, clsSkip, 'letter-cell-block');
        if (find != null) {
            return find;
        }
    }
    var back = dx == -plusX || dy < 0;
    return findNextOfClassGroup(start, cls, clsSkip, 'text-input-group', back ? -1 : 1);
}
/**
 * Find the next element with a desired class, within a parent defined by its class.
 * @param start - The current element
 * @param cls - The class of siblings
 * @param clsSkip - (optional) Another class to avoid
 * @param clsGroup - The class of the containing ancestor
 * @param dir - 1 (default) to look forward, or -1 to look backward
 * @returns Another element, or null if none
 */
function findNextOfClassGroup(start, cls, clsSkip, clsGroup, dir) {
    if (dir === void 0) { dir = 1; }
    var group = (0, classUtil_1.findParentOfClass)(start, clsGroup);
    var next = (0, classUtil_1.findNextOfClass)(start, cls, clsSkip, dir);
    if (group != null && (next == null || (0, classUtil_1.findParentOfClass)(next, clsGroup) != group)) {
        next = (0, classUtil_1.findFirstChildOfClass)(group, cls, clsSkip, dir);
    }
    return next;
}
/**
 * Find the input that the user likely means when navigating through a well-formed 2d grid
 * @param root - The root ancestor of the entire grid
 * @param start - The current input
 * @param dx - A horizontal direction to look
 * @param dy - A vertical direction to look
 * @param cls - a class to look for
 * @param clsSkip - a class to skip
 * @returns Another input within the grid
 */
function findNext2dInput(root, start, dx, dy, cls, clsSkip) {
    // TODO: root
    if (dy != 0) {
        // In a 2D grid, up/down keep their relative horizontal positions
        var parent = (0, classUtil_1.findParentOfClass)(start, 'letter-cell-block');
        var index = (0, classUtil_1.indexInContainer)(start, parent, cls);
        var nextParent = (0, classUtil_1.findNextOfClass)(parent, 'letter-cell-block', 'letter-grid-2d', dy);
        while (nextParent != null) {
            var dest = (0, classUtil_1.childAtIndex)(nextParent, cls, index);
            if (dest != null && !(0, classUtil_1.hasClass)(dest, 'letter-non-input')) {
                return dest;
            }
            nextParent = (0, classUtil_1.findNextOfClass)(nextParent, 'letter-cell-block', 'letter-grid-2d', dy);
        }
        dx = dy;
    }
    return (0, classUtil_1.findNextOfClass)(start, cls, clsSkip, dx);
}
/**
 * Find the input that the user likely means when navigating through a jumbled 2d grid
 * @param root - The root ancestor of the entire grid
 * @param start - The current input
 * @param dx - A horizontal direction to look
 * @param dy - A vertical direction to look
 * @param cls - a class to look for
 * @param clsSkip - a class to skip
 * @returns Another input within the grid
 */
function findNextByPosition(root, start, dx, dy, cls, clsSkip) {
    var rect = start.getBoundingClientRect();
    var pos = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    var elements = document.getElementsByClassName(cls);
    var distance = 0;
    var nearest = null;
    for (var i = 0; i < elements.length; i++) {
        var elmt = elements[i];
        if (clsSkip != undefined && (0, classUtil_1.hasClass)(elmt, clsSkip)) {
            continue;
        }
        if (root != null && root != (0, classUtil_1.findParentOfClass)(elmt, 'letter-grid-discover')) {
            continue;
        }
        rect = elmt.getBoundingClientRect();
        if (dx != 0) {
            // Look for inputs in the same row
            if (pos.y >= rect.y && pos.y < rect.y + rect.height) {
                // Measure distance in the dx direction
                var d = (rect.x + rect.width / 2 - pos.x) / dx;
                // Keep the nearest
                if (d > 0 && (nearest == null || d < distance)) {
                    distance = d;
                    nearest = elmt;
                }
            }
        }
        else if (dy != 0) {
            // Look for inputs in the same column
            if (pos.x >= rect.x && pos.x < rect.x + rect.width) {
                // Measure distance in the dy direction
                var d = (rect.y + rect.height / 2 - pos.y) / dy;
                if (d > 0 && (nearest == null || d < distance)) {
                    // Keep the nearest
                    distance = d;
                    nearest = elmt;
                }
            }
        }
    }
    if (nearest != null) {
        return nearest;
    }
    // Try again, but look in the next row/column
    var distance2 = 0;
    var wrap = null;
    for (var i = 0; i < elements.length; i++) {
        var elmt = elements[i];
        if (clsSkip != undefined && (0, classUtil_1.hasClass)(elmt, clsSkip)) {
            continue;
        }
        if (root != null && root != (0, classUtil_1.findParentOfClass)(elmt, 'letter-grid-discover')) {
            continue;
        }
        // Remember the first element (if dx/dy is positive), or else the last
        if (wrap == null || (dx < 0 || dy < 0)) {
            wrap = elmt;
        }
        rect = elmt.getBoundingClientRect();
        var d = 0, d2 = 0;
        if (dx != 0) {
            // Look for inputs in the next row, using dx as a dy
            d = (rect.y + rect.height / 2 - pos.y) / dx;
            d2 = rect.x / dx;
        }
        else if (dy != 0) {
            // Look for inputs in the next row, using dx as a dy
            d = (rect.x + rect.width / 2 - pos.x) / dy;
            d2 = rect.y / dy;
        }
        if (d > 0 && (nearest == null || d < distance || (d == distance && d2 < distance2))) {
            distance = d;
            distance2 = d2;
            nearest = elmt;
        }
    }
    return nearest != null ? nearest : wrap;
}
//# sourceMappingURL=textInput.js.map