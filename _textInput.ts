import { isTag, hasClass, getOptionalStyle,
    findParentOfClass, findFirstChildOfClass, findNextOfClass, 
    findInNextContainer, findEndInContainer,
    indexInContainer, childAtIndex, moveFocus } from "./_classUtil";
import { toggleHighlight } from "./_notes";
import { isDebug, theBoiler } from "./_boilerplate";
import { saveLetterLocally, saveWordLocally } from "./_storage";

/**
 * Any event stemming from key in this list should be ignored
 */
const ignoreKeys:string[] = [
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'OptionLeft', 'OptionRight', 'CapsLock', 'Backspace', 'Escape', 'Delete', 'Insert', 'NumLock', 'ScrollLock', 'Pause', 'PrintScreen',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16',
]

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
let keyDownTarget:HTMLInputElement|null = null;

/**
 * Callback when a user pressed a keyboard key from any letter-input or word-input text field
 * @param event - A keyboard event
 */
export function onLetterKeyDown(event: KeyboardEvent) {
    var input = event.currentTarget as HTMLInputElement;
    keyDownTarget = input;
    priorInputValue = input.value;

    var code = event.code;
    if (code == undefined || code == '') {
        code = event.key;  // Mobile doesn't use code
    }

    var inpClass = hasClass(input, 'word-input') ? 'word-input' : 'letter-input';
    let skipClass:string|undefined;
    if (!findParentOfClass(input, 'navigate-literals')) {
        skipClass = hasClass(input, 'word-input') ? 'word-non-input' : 'letter-non-input';
    }

    let prior:HTMLInputElement|null = null;

    if (hasClass(input.parentNode as Element, 'multiple-letter') || hasClass(input, 'word-input')) {
        // Multi-character fields still want the ability to arrow between cells.
        // We need to look at the selection prior to the arrow's effect, 
        // to see if we're already at the edge.
        if (code == ArrowNext || code == 'Enter') {
            var s = input.selectionStart;
            var e = input.selectionEnd;
            if (s == e && e == input.value.length) {
                var next = findNextInput(input, plusX, 0, inpClass, skipClass);
                if (next != null) {
                    moveFocus(next, 0);
                }
                event.preventDefault();
            }
        }
        else if (code == ArrowPrior) {
            var s = input.selectionStart;
            var e = input.selectionEnd;
            if (s == e && e == 0) {
                const prior:HTMLInputElement = findNextInput(input, -plusX, 0, inpClass, skipClass);
                if (prior != null) {
                    moveFocus(prior, prior.value.length);
                }
                event.preventDefault();
            }
        }
    }
    else {
        if (code == 'Backspace' || code == 'Space') {
            if (code == 'Space') {
                // Make sure user isn't just typing a space between words
                prior = findNextOfClass(input, 'letter-input', undefined, -1) as HTMLInputElement;
                if (prior != null && hasClass(prior, 'letter-non-input') && findNextOfClass(prior, 'letter-input') == input) {
                    var lit = prior.getAttribute('data-literal');
                    if (lit == ' ' || lit == '¶') {  // match any space-like things  (lit == '¤'?)
                        prior = findNextOfClass(prior, 'letter-input', 'literal', -1) as HTMLInputElement;
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
                var discoverRoot = findParentOfClass(input, 'letter-grid-discover');
                if (discoverRoot != null) {
                    prior = findParentOfClass(input, 'vertical')
                        ? findNextByPosition(discoverRoot, input, 0, dyDel, 'letter-input', 'letter-non-input')
                        : findNextByPosition(discoverRoot, input, dxDel, 0, 'letter-input', 'letter-non-input');
                }
                else {
                    prior = findNextOfClassGroup(input, 'letter-input', 'letter-non-input', 'text-input-group', dxDel) as HTMLInputElement;
                    if (!prior) {
                        const loop = findParentOfClass(input, 'loop-navigation');
                        if (loop) {
                            prior = findFirstChildOfClass(loop, 'letter-input', 'letter-non-input', dxDel) as HTMLInputElement;
                        }
                    }
                }
                ExtractFromInput(input);
                if (prior !== null) {
                    moveFocus(prior);
                    input = prior;  // fall through
                }
            }
            if (input != null && input.value.length > 0) {
                if (!hasClass(input.parentNode as Element, 'multiple-letter')) {
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
                toggleHighlight(input);
            }
            if (matchInputRules(input, event)) {
                input.value = event.key;
                afterInputUpdate(input);
            }
            event.preventDefault();
            return;
        }

        // Single-character fields always go to the next field
        if (code == ArrowNext) {
            moveFocus(findNextInput(input, plusX, 0, inpClass, skipClass));
            event.preventDefault();
        }
        else if (code == ArrowPrior) {
            moveFocus(findNextInput(input, -plusX, 0, inpClass, skipClass));
            event.preventDefault();
        }
    }

    if (code == 'ArrowUp' || code == 'PageUp') {
        moveFocus(findNextInput(input, 0, -1, inpClass, skipClass));
        event.preventDefault();
        return;
    }
    else if (code == 'ArrowDown' || code == 'PageDown') {
        moveFocus(findNextInput(input, 0, 1, inpClass, skipClass));
        event.preventDefault();
        return;
    }

    if (findParentOfClass(input, 'digit-only')) {
        if (event.key.length == 1 && (event.key >= 'A' && event.key < 'Z' || event.key > 'a' && event.key < 'z')) {
            // Completely disallow (English) alpha characters. Punctuation still ok.
            event.preventDefault();
        }
    }
}

/**
 * Does a typed character match the input rules?
 * @param input 
 * @param evt 
 * @returns 
 */
function matchInputRules(input:HTMLInputElement, evt:KeyboardEvent) {
    if (input.readOnly) {
        return false;
    }
    if (evt.key.length != 1 || evt.ctrlKey || evt.altKey) {
        return false;
    }
    return (input.inputMode === 'numeric')
        ? evt.key.match(/[0-9]/) : evt.key.match(/[a-z0-9]/i);
}

/**
 * Callback when a user releases a keyboard key from any letter-input or word-input text field
 * @param event - A keyboard event
 */
export function onLetterKey(event:KeyboardEvent) {
    if (event.isComposing) {
        return;  // Don't interfere with IMEs
    }

    if (isDebug()) {
        alert('code:' + event.code + ', key:' + event.key);
    }

    var input:HTMLInputElement = event.currentTarget as HTMLInputElement;
    if (input != keyDownTarget) {
        keyDownTarget = null;
        // key-down likely caused a navigation
        return;
    }
    keyDownTarget = null;

    var code = event.code;
    if (code == undefined || code == '') {
        code = event.key;  // Mobile doesn't use code
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
        moveFocus(findEndInContainer(input, 'letter-input', 'letter-non-input', 'letter-cell-block', 1) as HTMLInputElement);
        return;
    }
    else if (code == 'End') {
        moveFocus(findEndInContainer(input, 'letter-input', 'letter-non-input', 'letter-cell-block', -1) as HTMLInputElement);
        return;
    }
    else if (code == 'Backquote') {
        return;  // Highlight already handled in key down
    }
    if (input.value.length == 0 || ignoreKeys.indexOf(code) >= 0) {
        var multiLetter = hasClass(input.parentNode, 'multiple-letter');
        // Don't move focus if nothing was typed
        if (!multiLetter) {
            return;
        }
    }
    else if (input.value.length === 1 && !input.value.match(/[a-z0-9]/i)) {
        // Spaces and punctuation might be intentional, but if they follow a matching literal, they probably aren't.
        // NOTE: this tends to fail when the punctuation is stylized like smart quotes or minus instead of dash.
        var prior = findNextOfClass(input, 'letter-input', undefined, -1);
        if (prior != null && hasClass(prior, 'letter-non-input') && findNextOfClass(prior, 'letter-input') == input) {
            if (prior.getAttribute('data-literal') == input.value) {
                input.value = '';  // abort this space
                return;
            }
        }
    }
    afterInputUpdate(input);
}

/**
 * Re-scan for extractions
 * @param input The input which just changed
 */
export function afterInputUpdate(input:HTMLInputElement) {
    var text = input.value;
    if (hasClass(input.parentNode, 'lower-case')) {
        text = text.toLocaleLowerCase();
    }
    else if (!hasClass(input.parentNode, 'any-case')) {
        text = text.toUpperCase();
    }
    var overflow = '';
    var nextInput = findParentOfClass(input, 'vertical')
        ? findNextInput(input, 0, 1, 'letter-input', 'letter-non-input')
        : findNextInput(input, plusX, 0, 'letter-input', 'letter-non-input');

    var multiLetter = hasClass(input.parentNode, 'multiple-letter');
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
                moveFocus(nextInput);
                // Then do the same post-processing as this cell
                afterInputUpdate(nextInput);
            }
            else if (text.length > 0) {
                // Just move the focus
                moveFocus(nextInput);
            }
        }
    }
    else if (!hasClass(input.parentNode, 'fixed-spacing')) {
        var spacing = (text.length - 1) * 0.05;
        input.style.letterSpacing = -spacing + 'em';
        input.style.paddingRight = (2 * spacing) + 'em';
        //var rotate = text.length <= 2 ? 0 : (text.length * 5);
        //input.style.transform = 'rotate(' + rotate + 'deg)';
    }
    saveLetterLocally(input);
    inputChangeCallback(input);
}

/**
 * Extract contents of an extract-flagged input
 * @param input an input field
 */
function ExtractFromInput(input:HTMLInputElement) {
    var extractedId = getOptionalStyle(input, 'data-extracted-id', undefined, 'extracted-');
    if (findParentOfClass(input, 'extract')) {
        UpdateExtraction(extractedId);
    }
    else if (findParentOfClass(input, 'extractor')) {  // can also be numbered
        UpdateExtractionSource(input);
    }
    else if (findParentOfClass(input, 'numbered')) {
        UpdateNumbered(extractedId);
    }
}

/**
 * Update an extraction destination
 * @param extractedId The id of an element that collects extractions
 */
function UpdateExtraction(extractedId:string|null) {
    const extracted = document.getElementById(extractedId === null ? 'extracted' : extractedId);

    if (extracted == null) {
        return;
    }
    const join = getOptionalStyle(extracted, 'data-extract-join') || '';
    
    if (extracted.getAttribute('data-number-pattern') != null || extracted.getAttribute('data-letter-pattern') != null) {
        UpdateNumbered(extractedId);
        return;
    }
    
    const delayLiterals = DelayLiterals(extractedId);
    const inputs = document.getElementsByClassName('extract-input');
    let extraction = '';
    for (var i = 0; i < inputs.length; i++) {
        if (extractedId != null && getOptionalStyle(inputs[i], 'data-extracted-id', undefined, 'extracted-') != extractedId) {
            continue;
        }
        let letter = '';
        if (hasClass(inputs[i], 'extract-literal')) {
            // Several ways to extract literals:
            const de = getOptionalStyle(inputs[i], 'data-extract-delay');  // placeholder value to extract, until player has finished other work
            const ev = getOptionalStyle(inputs[i], 'data-extract-value');  // always extract this value
            const ec = getOptionalStyle(inputs[i], 'data-extract-copy');  // this extraction is a copy of another
            if (delayLiterals && de) {
                letter = de;
            }
            else if (ec) {
                letter = extraction[parseInt(ec) - 1];
            }
            else {
                letter = ev || '';
            }
        }
        else {
            const inp = inputs[i] as HTMLInputElement;
            letter = inp.value || '';
            letter = letter.trim();    
        }
        if (extraction.length > 0) {
            extraction += join;
        }
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
 * Puzzles can specify delayed literals within their extraction, 
 * which only show up if all non-literal cells are filled in.
 * @param extractedId The id of an element that collects extractions
 * @returns true if this puzzle uses this technique, and the non-literals are not yet done
 */
function DelayLiterals(extractedId:string|null) :boolean {
    let delayedLiterals = false;
    let isComplete = true;
    var inputs = document.getElementsByClassName('extract-input');
    for (var i = 0; i < inputs.length; i++) {
        if (extractedId != null && getOptionalStyle(inputs[i], 'data-extracted-id', undefined, 'extracted-') != extractedId) {
            continue;
        }
        if (hasClass(inputs[i], 'extract-literal')) {
            if (getOptionalStyle(inputs[i], 'data-extract-delay')) {
                delayedLiterals = true;
            }
        }
        else {
            const inp = inputs[i] as HTMLInputElement;
            let letter = inp.value || '';
            letter = letter.trim();
            if (letter.length == 0) {
                isComplete = false;
            }
        }
    }
    return delayedLiterals && !isComplete;
}

/**
 * Check whether a collection of extracted text is more than blanks and underlines
 * @param text Generated extraction, which may still contain underlines for missing parts
 * @returns true if text contains anything other than spaces and underlines
 */
function ExtractionIsInteresting(text:string): boolean {
    if (text == undefined) {
        return false;
    }
    return text.length > 0 && text.match(/[^_]/) != null;
}

/**
 * Update an extraction area with new text
 * @param text The current extraction
 * @param dest The container for the extraction. Can be a div or an input
 */
function ApplyExtraction(   text:string, 
                            dest:HTMLElement) {
    if (hasClass(dest, 'lower-case')) {
        text = text.toLocaleLowerCase();
    }
    else if (hasClass(dest, 'all-caps')) {
        text = text.toLocaleUpperCase();
    }

    const destInp:HTMLInputElement|null = isTag(dest, 'INPUT') ? dest as HTMLInputElement : null;
    const destText:HTMLElement|null = isTag(dest, 'TEXT') ? dest as HTMLElement : null;
    var current = (destInp !== null) ? destInp.value : (destText !== null) ? destText.innerHTML : dest.innerText;
    if (!ExtractionIsInteresting(text) && !ExtractionIsInteresting(current)) {
        return;
    }
    if (!ExtractionIsInteresting(text) && ExtractionIsInteresting(current)) {
        text = '';
    }
    if (destInp) {
        destInp.value = text;    
    }
    else if (destText) {
        destText.innerHTML = '';
        destText.appendChild(document.createTextNode(text));
    }
    else {
        dest.innerText = text;
    }
}

/**
 * Update an extraction that uses numbered indicators
 * @param extractedId The id of an extraction area
 */
function UpdateNumbered(extractedId:string|null) {
    var inputs = document.getElementsByClassName('extract-input');
    for (var i = 0; i < inputs.length; i++) {
        const inp = inputs[i] as HTMLInputElement
        const index = inputs[i].getAttribute('data-number');
        const extractCell = document.getElementById('extractor-' + index) as HTMLInputElement;
        let letter = inp.value || '';
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
function UpdateExtractionSource(input:HTMLInputElement) {
    //var extractedId = getOptionalStyle(input, 'data-extracted-id', null, 'extracted-');
    var extractors = document.getElementsByClassName('extractor-input');
    var index = getOptionalStyle(input.parentNode as Element, 'data-number');
    if (index === null) {
        for (var i = 0; i < extractors.length; i++) {
            if (extractors[i] == input) {
                index = "" + (i + 1);  // start at 1
                break;
            }
        }
    }
    if (index === null) {
        return;
    }
    var sources = document.getElementsByClassName('extract-input');
    for (var i = 0; i < sources.length; i++) {
        var src = sources[i] as HTMLInputElement;
        var dataNumber = getOptionalStyle(src, 'data-number');
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
export function onWordKey(event:KeyboardEvent) {
    if (event.isComposing) {
        return;  // Don't interfere with IMEs
    }

    const input = event.currentTarget as HTMLInputElement;
    if (getOptionalStyle(input, 'data-extract-index') != null) {
        var extractId = getOptionalStyle(input, 'data-extracted-id', undefined, 'extracted-');
        updateWordExtraction(extractId);
    }

    var code = event.code;
    if (code == 'Enter') {
        code = event.shiftKey ? 'ArrowUp' : 'ArrowDown';
    }
    if (code == 'PageUp') {
        moveFocus(findNextOfClass(input, 'word-input', undefined, -1) as HTMLInputElement);
        return;
    }
    else if (code == 'Enter' || code == 'PageDown') {
        moveFocus(findNextOfClass(input, 'word-input') as HTMLInputElement);
        return;
    }
}

/**
 * Update extractions that come from word input
 * @param extractedId The ID of an extraction area
 */
export function updateWordExtraction(extractedId:string|null) {
    var extracted = document.getElementById(extractedId === null ? 'extracted' : extractedId);

    if (extracted == null) {
        return;
    }
    
    var inputs = document.getElementsByClassName('word-input');
    var extraction = '';
    var partial = false;
    for (var i = 0; i < inputs.length; i++) {
        if (extractedId != null && getOptionalStyle(inputs[i], 'data-extracted-id', undefined, 'extracted-') != extractedId) {
            continue;
        }
        var index = getOptionalStyle(inputs[i], 'data-extract-index', '') as string;
        const indeces = index.split(' ');
        for (var j = 0; j < indeces.length; j++) {
            var extractIndex = parseInt(indeces[j]);
            if (extractIndex > 0) {  // indeces start at 1
                const inp = inputs[i] as HTMLInputElement;  
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
export function onLetterChange(event:KeyboardEvent) {
    if (event.isComposing) {
        return;  // Don't interfere with IMEs
    }

    const input = findParentOfClass(event.currentTarget as Element, 'letter-input') as HTMLInputElement;
    saveLetterLocally(input);
    inputChangeCallback(input);
}

/**
 * Callback when user has changed the text in a word-input 
 * @param event A keyboard event
 */
export function onWordChange(event:KeyboardEvent) {
    if (event.isComposing) {
        return;  // Don't interfere with IMEs
    }

    const input = findParentOfClass(event.currentTarget as Element, 'word-input') as HTMLInputElement;
    saveWordLocally(input);
    inputChangeCallback(input);
}

/**
 * Anytime any note changes, inform any custom callback
 * @param inp The affected input
 */
function inputChangeCallback(inp: HTMLInputElement) {
    const fn = theBoiler().onInputChange;
    if (fn) {
        fn(inp);
    }
}

/**
 * Find the input that the user likely means when navigating from start in a given x,y direction
 * @param start - The current input
 * @param dx - A horizontal direction to look
 * @param dy - A vertical direction to look
 * @param cls - a class to look for
 * @param clsSkip - a class to skip
 * @returns 
 */
function findNextInput( start: Element, 
                        dx: number, 
                        dy: number, 
                        cls: string, 
                        clsSkip: string|undefined)
                        : HTMLInputElement {
    const root2d = findParentOfClass(start, 'letter-grid-2d');
    const loop = findParentOfClass(start, 'loop-navigation');
    let find:HTMLInputElement|null = null;
    if (root2d != null) {
        find = findNext2dInput(root2d, start, dx, dy, cls, clsSkip);
        if (find != null) {
            return find;
        }
    }
    const discoverRoot = findParentOfClass(start, 'letter-grid-discover');
    if (discoverRoot != null) {
        find = findNextDiscover(discoverRoot, start, dx, dy, cls, clsSkip) as HTMLInputElement|null;
        if (find != null) {
            return find;
        }
        find = findNextByPosition(discoverRoot, start, dx, dy, cls, clsSkip);
        if (find != null) {
            return find;
        }
    }
    if (dy < 0) {
        find = findInNextContainer(start, cls, clsSkip, 'letter-cell-block', -1) as HTMLInputElement;
        if (find != null) {
            return find;
        }
    }
    if (dy > 0) {
        find = findInNextContainer(start, cls, clsSkip, 'letter-cell-block') as HTMLInputElement;
        if (find != null) {
            return find;
        }
    }
    const back = dx == -plusX || dy < 0;
    const next = findNextOfClassGroup(start, cls, clsSkip, 'text-input-group', back ? -1 : 1) as HTMLInputElement;
    if (loop != null && findParentOfClass(next, 'loop-navigation') != loop) {
        find = findFirstChildOfClass(loop, cls, clsSkip, back ? -1 : 1) as HTMLInputElement;
        if (find) {
            return find;
        }
    }
    return next;
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
function findNextOfClassGroup(  start: Element,
                                cls: string, 
                                clsSkip: string|undefined, 
                                clsGroup: string, 
                                dir:number = 1)
                                : Element|null {
    var group = findParentOfClass(start, clsGroup);
    var next = findNextOfClass(start, cls, clsSkip, dir);
    if (group != null && (next == null || findParentOfClass(next, clsGroup) != group)) {
        next = findFirstChildOfClass(group, cls, clsSkip, dir);
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
function findNext2dInput(   root: Element, 
                            start: Element, 
                            dx: number, 
                            dy: number, 
                            cls: string, 
                            clsSkip: string|undefined)
                            : HTMLInputElement {
  // TODO: root
    if (dy != 0) {
        // In a 2D grid, up/down keep their relative horizontal positions
        var parent = findParentOfClass(start, 'letter-cell-block');
        var index = indexInContainer(start, parent as Element, cls);
        var nextParent = findNextOfClass(parent as Element, 'letter-cell-block', 'letter-grid-2d', dy);
        while (nextParent != null) {
            var dest:HTMLInputElement = childAtIndex(nextParent, cls, index) as HTMLInputElement;
            if (dest != null && !hasClass(dest, clsSkip)) {
                return dest;
            }
            nextParent = findNextOfClass(nextParent, 'letter-cell-block', 'letter-grid-2d', dy);
        }
        dx = dy;
    }        
    return findNextOfClass(start, cls, clsSkip, dx) as HTMLInputElement;
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
function findNextByPosition(root: Element,
                            start: Element, 
                            dx: number, 
                            dy: number, 
                            cls: string, 
                            clsSkip: string|undefined)
                            : HTMLInputElement|null {
    let rect = start.getBoundingClientRect();
    let pos = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const elements = document.getElementsByClassName(cls);
    let distance = 0;
    let nearest:HTMLInputElement|null = null;
    for (let i = 0; i < elements.length; i++) {
        const elmt = elements[i];
        if (clsSkip != undefined && hasClass(elmt, clsSkip)) {
            continue;
        }
        if (root != null && root != findParentOfClass(elmt, 'letter-grid-discover')) {
            continue;
        }
        rect = elmt.getBoundingClientRect();
        if (dx != 0) {
            // Look for inputs in the same row
            if (pos.y >= rect.y && pos.y < rect.y + rect.height) {
                // Measure distance in the dx direction
                const d = (rect.x + rect.width / 2 - pos.x) / dx;
                // Keep the nearest
                if (d > 0 && (nearest == null || d < distance)) {
                    distance = d;
                    nearest = elmt as HTMLInputElement;
                }
            }
        }
        else if (dy != 0) {
            // Look for inputs in the same column
            if (pos.x >= rect.x && pos.x < rect.x + rect.width) {
                // Measure distance in the dy direction
                const d = (rect.y + rect.height / 2 - pos.y) / dy;
                if (d > 0 && (nearest == null || d < distance)) {
                    // Keep the nearest
                    distance = d;
                    nearest = elmt as HTMLInputElement;
                }
            }
        }
    }
    if (nearest != null) {
        return nearest;
    }

    // Try again, but look in the next row/column
    rect = start.getBoundingClientRect();
    pos = plusX > 0 ? { x: rect.x + (dy > 0 ? rect.width - 1 : 1), y: rect.y + (dx > 0 ? rect.height - 1 : 1) }
                    : { x: rect.x + (dy < 0 ? rect.width - 1 : 1), y: rect.y + (dx < 0 ? rect.height - 1 : 1) }
    let distance2 = 0;
    let wrap:HTMLInputElement|null = null;
    for (let i = 0; i < elements.length; i++) {
        const elmt = elements[i];
        if (clsSkip != undefined && hasClass(elmt, clsSkip)) {
            continue;
        }
        if (root != null && root != findParentOfClass(elmt, 'letter-grid-discover')) {
            continue;
        }
        // Remember the first element (if dx/dy is positive), or else the last
        if (wrap == null || (dx < 0 || dy < 0)) {
            wrap = elmt as HTMLInputElement;
        }
        rect = elmt.getBoundingClientRect();
        // d measures direction in continuing perpendicular direction
        // d2 measures relative position within original direction
        let d = 0, d2 = 0;
        if (dx != 0) {
            // Look for inputs in the next row, using dx as a dy
            d = (rect.y + rect.height / 2 - pos.y) / (dx * plusX);
            d2 = rect.x / dx;
        }
        else if (dy != 0) {
            // Look for inputs in the next row, using dx as a dy
            d = (rect.x + rect.width / 2 - pos.x) / (dy * plusX);
            d2 = rect.y / dy;
        }
        // Remember the earliest (d2) element in nearest next row (d)
        if (d > 0 && (nearest == null || d < distance || (d == distance && d2 < distance2))) {
            distance = d;
            distance2 = d2;
            nearest = elmt as HTMLInputElement;
        }
    }
    return nearest != null ? nearest : wrap;
}

/**
 * Smallest rectangle that bounds both inputs
 */
function union(rect1:DOMRect, rect2:DOMRect) :DOMRect {
    const left = Math.min(rect1.left, rect2.left);
    const right = Math.max(rect1.right, rect2.right);
    const top = Math.min(rect1.top, rect2.top);
    const bottom = Math.max(rect1.bottom, rect2.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  }

/**
 * Distort a distance by a sympathetic factor
 * @param delta An actual distance (either horizontal or vertical)
 * @param bias A desired direction of travel, within that axis
 * @returns Shrinks delta, when it aligns with bias, stretches when orthogonal, and -1 when in the wrong direction
 */
function bias(delta:number, bias:number) {
    if (bias != 0) {
        if (delta * bias > 0) {
            return Math.abs(delta * 0.8);  // sympathetic bias shrinks distance
        }
        else {
            return -1;  // anti-bias invalidates distance
        }
    }
    return Math.abs(delta) * 1.2;  // orthogonal bias stretches distance
}

/**
 * Measure the distance from one point to another, given a biased travel direction
 * @param from the starting point
 * @param toward the destination point
 * @param bx the desired x movement
 * @param by the desired y movement
 * @returns a skewed distance, where some objects seem nearer and some farther.
 * A negative distance indicates an object in the wrong direction.
 */
function biasedDistance(from:DOMPoint, toward:DOMPoint, bx:number, by:number) :number {
    let dx = bias(toward.x - from.x, bx);
    let dy = bias(toward.y - from.y, by);
    if (dx < 0 || dy < 0) {
        return -1;  // Invalid target
    }
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * When moving off the edge of a world, what is a position on the far side, where we might resume?
 * @param world the boundary rectangle of the world
 * @param pos the starting point
 * @param dx the movement of x travel
 * @param dy the movement of y travel
 * @returns A position aligned with pos, but on the side away from dx,dy
 */
function wrapAround(world:DOMRect, pos:DOMPoint, dx:number, dy:number) :DOMPoint {
    if (dx > 0) {  // wrap around right to far left
        return new DOMPoint(world.left - dx, pos.y);
    }
    if (dx < 0) {  // wrap around left to far right
        return new DOMPoint(world.right - dx, pos.y);
    }
    if (dy > 0) {  // wrap around bottom to far top
        return new DOMPoint(pos.x, world.top - dy);
    }
    if (dy < 0) {  // wrap around top to far bottom
        return new DOMPoint(pos.x, world.bottom - dy);
    }
    return pos;
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
function findNextDiscover(root: Element,
                            start: Element, 
                            dx: number, 
                            dy: number, 
                            cls: string, 
                            clsSkip: string|undefined)
                            : HTMLElement|null {
    let rect = start.getBoundingClientRect();
    let bounds = rect;
    let pos = new DOMPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const elements = document.getElementsByClassName(cls);
    let distance = -1;
    let nearest:HTMLElement|null = null;
    for (let i = 0; i < elements.length; i++) {
        const elmt = elements[i] as HTMLElement;
        if (clsSkip != undefined && hasClass(elmt, clsSkip)) {
            continue;
        }
        if (root != null && root != findParentOfClass(elmt, 'letter-grid-discover')) {
            continue;
        }
        rect = elmt.getBoundingClientRect();
        bounds = union(bounds, rect);
        let center = new DOMPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        let d2 = biasedDistance(pos, center, dx, dy);
        if (d2 > 0 && (nearest == null || d2 < distance)) {
            nearest = elmt;
            distance = d2;
        }
    }
    if (nearest == null) {
        // Wrap around
        pos = wrapAround(bounds, pos, dx, dy);
        for (let i = 0; i < elements.length; i++) {
            const elmt = elements[i] as HTMLElement;
            if (clsSkip != undefined && hasClass(elmt, clsSkip)) {
                continue;
            }
            if (root != null && root != findParentOfClass(elmt, 'letter-grid-discover')) {
                continue;
            }
            rect = elmt.getBoundingClientRect();
            let center = new DOMPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            let d2 = biasedDistance(pos, center, dx, dy);
            if (d2 > 0 && (nearest == null || d2 < distance)) {
                nearest = elmt;
                distance = d2;
            }
        }
    }
    return nearest;
}