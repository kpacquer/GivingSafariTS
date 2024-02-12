import { theBoiler } from "./_boilerplate";
import { applyAllClasses, isTag, toggleClass } from "./_classUtil";
import { getLetterStyles } from "./_textSetup";

/****************************************************************************
 *          BUILDER
 * 
 * Buider HTML is loosely inspired by React.
 * It defines the data first.
 * Then the HTML supports special tags for loops and conditionals,
 * and the text and attributes support lookups into the data.
 * 
 * Data initialization:
 *    In the script block of the page, add two values to the boilerplate:
 *        const boiler = {
 *          ...
 *          'reactiveBuilder': true,  // required
 *          'builderLookup': {        // free-form, for example...
 *            magic: 123,
 *            line: { start: {x:1, y:2}, end: {x:3, y:4} },
 *            fonts: [ 'bold', 'italic' ],
 *            grid: [
 *              [1, 2, 3],
 *              [4, 5, 6]
 *            ]
 *          }
 *        };
 *
 * Data lookup:
 *    In text or attribute values, use curly-brace syntax to inject named values:
 *    Examples in text:
 *      {magic}             =>  123
 *      {line.end.x}        =>  3
 *      {grid.0.1}          =>  2   // note that .0 and .1 are indeces
 *     
 *    Examples in attributes:
 *      <div id="{magic}" class="{fonts.0} {fonts.1}">
 *                          =>  <div id="123" class="bold italic">
 * 
*    There is a special rule for tags and attributes prefixed with _
 *    when you need to avoid the pre-processed tags/attributes being acted upon by the DOM.
 *      <_img _src="{fonts.0}Icon.png">
 *                          =>  <img src="boldIcon.png">
 * 
 *   Parameterized lookups allow one lookup to be used to name the child of another.
 *   Any nested pair of [brackets] restarts the lookup context at the root.
 *      {grid.[line.start.x].[line.start.y]}
 *                          ==  {grid.1.2}      =>  5
 * 
 * <for> Loops:
 *    Use the new <for> tag to loop over a set of values, 
 *    cloning and re-evaluating the contents of the loop for each.
 * 
 *    The targets of loops are implicitly lookups, so the {curly} syntax is not needed.
 *    As they expand, new nested values are dynamically added to the lookup table, to reflect the loop state.
 *
 *    Loop over elements in a list:
 *      <for each="font" in="fonts">{font#}:{font} </for>
 *                          =>  0:bold 1:italic
 *        Note: in="fonts" could have been in="{fonts}"
 *        Inside the <for> tags, new temporary named values exist based on the name specified in each=""
 *          {font} for each value in the list,
 *          and {font#} for the index of that item (starting at 0)
 * 
 *    Loop over fields in an object:
 *      <for key="a" in="line.start">{a#}:{a}={a!} </for>
 *                          =>  0:x=1 1:y=2
 *        Inside the <for> tags, an additional temporary:
 *          {a} for each key in the object, {a#} for the index of that key,
 *          and {a!} for the value corresponding to that key.
 * 
 *    Loop over characters in text:
 *      <for char="ch" in="fonts.0">{ch} </for>
 *                          =>  b o l d
 *      <for char="ch" in="other">{ch} </for>
 *                          =>  o t h e r
 * 
 *        Note that the in="value" can be a literal.
 * 
 *    Loop over words in text:
 *      <for char="w" in="Hello World!">{w}-{w}</for>
 *                          =>  Hello-HelloWorld!-World!
 *
 *        Word is really anything delimited by spaces.
 * 
 *    Loop over a range of values:
 *      <for range="i" from="1" to="3">{i}</for>
 *                          =>  123
 *      <for range="i" from="1" until="3">{i}</for>
 *                          =>  12
 *      <for range="i" from="5" to="0" step="-2">{i}</for>
 *                          =>  531
 *
 *        from=""   specifies the start value
 *        to=""     specifies the last value (inclusive)
 *        until=""  specifies a stop value (exclusive)
 *        step=""   specifies a step value, if not 1
 * 
 *    Use ranges to in compound lookups:
 *      <for range="row" from="0" to="1">
 *        <for range="col" from="0" to="2">
 *          {grid.[row].[col]}
 *      </for>,</for>
 *                          =>  1 2 3 , 4 5 6
 * 
 *  <if> conditionals
 *    Use the new <if> tag to check a lookup against various states.
 *    The checked values are implicitly lookups, so the {curly} syntax is not needed.
 *    No new temporary values are generated by ifs.
 * 
 *    Note: there is no else syntax. Instead, concatenate multiple ifs.
 *      As such, be careful not to nest, unless intended.
 *
 *    <if test="magic" eq="123">Magic!</if>
 *    <if test="magic" ne="123">Lame.</if>
 *                          =>  Magic!
 *    <if test="magic" ge="100">Big!
 *    <if test="magic" ge="120">Bigger!</if>
 *    </if>
 *                          =>  Big!Bigger!
 * 
 *        Relative operators:
 *          eq=""       Equality (case-sensitive, in all cases)
 *          ne=""       Not-equals
 *          gt=""       Greater than
 *          lt=""       Less than
 *          ge=""       Greater than or equals
 *          le=""       Less than or equals
 *        Containment operators:
 *          in="super"  Test value is IN (a substring of) "super"
 *          ni="super"  Test value is NOT IN (not a substring of) "super"
 *        There is no NOT modifier. Instead, use the converse operator.
 *
 * 
 *  Loops and Tables:
 *    It is tempting to use loops inside <table> tags.
 *    However, the DOM will likely refactor them if found inside a <table> but not inside <td>.
 *    
 *    Two options: _prefix and CSS
 *      <_table>
 *        <for ...>
 *          <_tr>
 *            <if eq ...><_th></_th></if>
 *            <if ne ...><_td></_td></if>
 *          </_tr>
 *        </for>
 *      </_table>
 * 
 *      <div style="display:table">
 *        <for ...>
 *          <div style="display:table-row">
 *            <if eq ...><div style="display:table-header"></div></if>
 *            <if ne ...><div style="display:table-cell"></div></if>
 *          </div>
 *        </for>
 *      </div>
 */


const builder_tags = [
  'build', 'use', 'for', 'if'
];
function identifyBuilders() {
  for (const t of builder_tags) {
    const tags = document.getElementsByTagName(t);
    for (let i=0; i < tags.length; i++) {
      toggleClass(tags[i], 'builder_control', true);
    }  
  }
}

/**
 * Look for control tags like for loops and if branches.
 */
export function expandControlTags() {
  identifyBuilders();
  const context = theBoiler().builderLookup || {};

  let controls = document.getElementsByClassName('builder_control');
  while (controls.length > 0) {
    const src = controls[0] as HTMLElement;
    let dest:Node[] = [];
    if (isTag(src, 'build')) {
      dest = expandContents(src, context);
    }
    else if (isTag(src, 'for')) {
      dest = startForLoop(src, context);
    }
    else if (isTag(src, 'if')) {
      dest = startIfBlock(src, context);
    }
    else if (isTag(src, 'use')) {
      dest = useTemplate(src, context);
    }
    const parent = src.parentNode;
    for (let d = 0; d < dest.length; d++) {
      const node = dest[d];
      parent?.insertBefore(node, src);
    }
    parent?.removeChild(src);

    // See if there are more
    controls = document.getElementsByClassName('builder_control');
  }
}

/**
 * Concatenate one list onto another
 * @param list The list to modified
 * @param add The list to add to the end
 */
function pushRange(list:Node[], add:Node[]) {
  for (let i = 0; i < add.length; i++) {
    list.push(add[i]);
  }
}

/**
 * Append more than one child node to the end of a parent's child list
 * @param parent The parent node
 * @param add A list of new children
 */
function appendRange(parent:Node, add:Node[]) {
  for (let i = 0; i < add.length; i++) {
    parent.insertBefore(add[i], null);
  }
}

/**
 * Potentially several kinds of for loops:
 * for each: <for each="var" in="list">  // ideas for optional args: first, last, skip
 * for char: <for char="var" in="text">  // every character in a string
 * for word: <for word="var" in="text">  // space-delimited substrings
 * for range: <for range="var" from="first" to="last" or until="after"> 
 * for key: <for key="var" in="object">  // idea for optional arg: sort
 * @param src the <for> element
 * @param context the set of values that might get used by the for loop
 * @returns a list of nodes, which will replace this <for> element
 */
function startForLoop(src:HTMLElement, context:object):Node[] {
  const dest:Node[] = [];

  let iter:string|null = null;
  let list:any[] = [];
  let vals:any[] = [];  // not always used

  // <for each="variable_name" in="list">
  iter = src.getAttributeNS('', 'each');
  if (iter) {
    list = parseForEach(src, context);
  }
  else {
    iter = src.getAttributeNS('', 'char');
    if (iter) {
      list = parseForText(src, context, '');
    }
    else {
      iter = src.getAttributeNS('', 'word');
      if (iter) {
        list = parseForText(src, context, ' ');
      }
      else {
        iter = src.getAttributeNS('', 'key');
        if (iter) {
          list = parseForKey(src, context);
          vals = list[1];
          list = list[0];
        }
        else {
          iter = src.getAttributeNS('', 'range');
          if (iter) {
            list = parseForRange(src, context);
          }
          else {
            throw new Error('Unrecognized <for> tag type: ' + src);
          }
        }
      }
    }
  }

  const iter_index = iter + '#';
  for (let i = 0; i < list.length; i++) {
    context[iter_index] = i;
    context[iter] = list[i];
    if (vals.length > 0) {
      context[iter + '!'] = vals[i];
    }
    pushRange(dest, expandContents(src, context));
  }
  context[iter_index] = undefined;
  context[iter] = undefined;
  
  return dest;
}

/**
 * Syntax: <for each="var" in="list">
 * @param src 
 * @param context 
 * @returns a list of elements
 */
function parseForEach(src:HTMLElement, context:object):any[] {
  const list_name = src.getAttributeNS('', 'in');
  if (!list_name) {
    throw new Error('for each requires "in" attribute');
  }
  return anyFromContext(list_name, context);
}

function parseForText(src:HTMLElement, context:object, delim:string) {
  const list_name = src.getAttributeNS('', 'in');
  if (!list_name) {
    throw new Error('for char requires "in" attribute');
  }
  // The list_name can just be a literal string
  const list = (list_name in context) ? context[list_name] : list_name;
  if (!list) {
    throw new Error('unresolved context: ' + list_name);
  }
  return list.split(delim);
}

function parseForRange(src:HTMLElement, context:object):any {
  const from = src.getAttributeNS('', 'in');
  let until = src.getAttributeNS('', 'until');
  const last = src.getAttributeNS('', 'to');
  const step = src.getAttributeNS('', 'step');

  const start = from ? parseInt(textFromContext(from, context)) : 0;
  let end = until ? parseInt(textFromContext(until, context))
    : last ? (parseInt(textFromContext(last, context)) + 1)
    : start;
  const inc = step ? parseInt(textFromContext(step, context)) : 1;
  if (!until && inc < 0) {
    end -= 2;  // from 5 to 1 step -1 means i >= 0
  }

  const list:number[] = [];
  for (let i = start; inc > 0 ? (i < end) : (i > end); i += inc) {
    list.push(i);
  }
  return list;
}

function parseForKey(src:HTMLElement, context:object):any {
  const obj_name = src.getAttributeNS('', 'in');
  if (!obj_name) {
    throw new Error('for each requires "in" attribute');
  }
  const obj = anyFromContext(obj_name, context)
  if (!obj) {
    throw new Error('unresolved list context: ' + obj_name);
  }
  const keys = Object.keys(obj);
  const vals = keys.map(k => obj[k]);
  return [keys, vals];
}

/**
 * Potentially several kinds of if expressions:
 *   equality: <if test="var" eq="value">  
 *   not-equality: <if test="var" ne="value">  
 *   less-than: <if test="var" lt="value">  
 *   less-or-equal: <if test="var" le="value">  
 *   greater-than: <if test="var" gt="value">  
 *   greater-or-equal: <if test="var" ge="value">  
 *   contains: <if test="var" in="value">  
 *   not-contains: <if test="var" ni="value">  
 *   boolean: <if test="var">
 * Note there is no else or else-if block, because there are no scoping blocks
 * @param src the <if> element
 * @param context the set of values that might get used by or inside the if block
 * @returns a list of nodes, which will replace this <if> element
 */
function startIfBlock(src:HTMLElement, context:object):Node[] {
  let test = src.getAttributeNS('', 'test');
  if (!test) {
    throw new Error('<if> tags must have a test attribute');
  }
  test = textFromContext(test, context); 

  let pass:boolean = false;
  let value:string|null;
  if (value = src.getAttributeNS('', 'eq')) {  // equality
    pass = test == textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'ne')) {  // not-equals
    pass = test != textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'lt')) {  // less-than
    pass = test < textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'le')) {  // less-than or equals
    pass = test <= textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'gt')) {  // greater-than
    pass = test > textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'ge')) {  // greater-than or equals
    pass = test >= textFromContext(value, context);
  }
  else if (value = src.getAttributeNS('', 'in')) {  // string contains
    pass = textFromContext(value, context).indexOf(test) >= 0;
  }
  else if (value = src.getAttributeNS('', 'ni')) {  // string doesn't contain
    pass = textFromContext(value, context).indexOf(test) >= 0;
  }
  else {  // simple boolean
    pass = test === 'true';
  }

  if (pass) {
    // No change in context from the if
    return expandContents(src, context);

  }
  
  return [];
}

const inputAreaTagNames = [
  'letter', 'letters', 'literal', 'number', 'numbers', 'pattern', 'word'
];

/**
 * Shortcut tags for text input. These include:
 *  letter: any single character
 *  letters: a few characters, in a single input
 *  literal: readonly single character
 *  number: any numeric digit
 *  numbers: a few numeric digits
 *  word: full multi-character
 *  pattern: multiple inputs, generated from a pattern
 * @param src One of the input shortcut tags
 * @param context A dictionary of all values that can be looked up
 * @returns a node array containing a single <span>
 */
function startInputArea(src:HTMLElement, context:object):Node[] {
  const span = document.createElement('span');

  // Copy most attributes. 
  // Special-cased ones are harmless - no meaning in generic spans
  cloneAttributes(src, span, context);

  let cloneContents = false;
  let literal:string|null = null;
  const extract = src.getAttributeNS('', 'extract');

  var styles = getLetterStyles(src, 'underline', '', 'box');

  // Convert special attributes to data-* attributes for later text setup
  let attr:string|null;
  if (isTag(src, 'letter')) {  // 1 input cell for (usually) one character
    toggleClass(span, 'letter-cell', true);
    literal = src.getAttributeNS('', 'literal');  // converts letter to letter-literal
  }
  else if (isTag(src, 'letters')) {  // 1 input cell for a few characters
    toggleClass(span, 'letter-cell', true);
    toggleClass(span, 'multiple-letter', true);
    literal = src.getAttributeNS('', 'literal');  // converts letter to letter-literal
  }
  else if (isTag(src, 'literal')) {  // 1 input cell for (usually) one character
    toggleClass(span, 'letter-cell', true);
    toggleClass(span, 'literal', true);
    cloneContents = true;  // literal value
  }
  else if (isTag(src, 'number')) {  // 1 input cell for one numeric character
    toggleClass(span, 'letter-cell', true);
    toggleClass(span, 'numeric', true);
    literal = src.getAttributeNS('', 'literal');  // converts letter to letter-literal
  }
  else if (isTag(src, 'numbers')) {  // 1 input cell for multiple numeric digits
    toggleClass(span, 'letter-cell', true);
    toggleClass(span, 'multiple-letter', true);
    toggleClass(span, 'numeric', true);
    // To support longer (or negative) numbers, set class = 'multiple-letter'
    literal = src.getAttributeNS('', 'literal');  // converts letter to letter-literal
  }
  else if (isTag(src, 'word')) {  // 1 input cell for (usually) one character
    toggleClass(span, 'word-cell', true);
  }
  else if (isTag(src, 'pattern')) {  // multiple input cells for (usually) one character each
    toggleClass(span, 'create-from-pattern', true);
    if (attr = src.getAttributeNS('', 'pattern')) {
      span.setAttributeNS('', 'data-letter-pattern', textFromContext(attr, context));
    }
    if (attr = src.getAttributeNS('', 'extract')) {
      span.setAttributeNS('', 'data-extract-indeces', textFromContext(attr, context));
    }
    if (attr = src.getAttributeNS('', 'numbers')) {
      span.setAttributeNS('', 'data-number-assignments', textFromContext(attr, context));
    }
  }
  else {
    return [src];  // Unknown tag. NYI?
  }

  if (literal) {
    span.innerText = textFromContext(literal, context);  
    applyAllClasses(span, styles.literal);
  }      
  else if (!isTag(src, 'pattern')) {
    applyAllClasses(span, styles.letter);
    if (extract != null) {
      applyAllClasses(span, styles.extract);
    }
  }

  if (cloneContents) {
    appendRange(span, expandContents(src, context));
  }

  return [span];
}

/**
 * Clone every node inside a parent element.
 * Any occurence of {curly} braces is in fact a lookup.
 * It can be in body text or an element attribute value
 * @param src The containing element
 * @param context A dictionary of all values that can be looked up
 * @returns A list of nodes
 */
function expandContents(src:HTMLElement, context:object):Node[] {
  const dest:Node[] = [];
  for (let i = 0; i < src.childNodes.length; i++) {
    const child = src.childNodes[i];
    if (child.nodeType == Node.ELEMENT_NODE) {
      const child_elmt = child as HTMLElement;
      if (isTag(child_elmt, 'for')) {
        pushRange(dest, startForLoop(child_elmt, context));
      }
      else if (isTag(child_elmt, 'if')) {
        pushRange(dest, startIfBlock(child_elmt, context));
      }
      else if (isTag(child_elmt, 'use')) {
        pushRange(dest, useTemplate(child_elmt, context));
      }
      else if (isTag(child_elmt, inputAreaTagNames)) {
        pushRange(dest, startInputArea(child_elmt, context));
      }
      else {
        dest.push(cloneWithContext(child_elmt, context));
      }
    }
    else if (child.nodeType == Node.TEXT_NODE) {
      pushRange(dest, cloneTextNode(child as Text, context));
    }
    else {
      dest.push(cloneNode(child));
    }
  }

  return dest;
}

/**
 * Some HTML elements and attributes are immediately acted upon by the DOM.
 * To delay that until after builds (especially <for> and <if>), 
 * use _prefx or suffix_, and the tag or attribute will be renamed when cloned.
 * @param name Any tag or attribute name
 * @returns The name, or the the name without the _
 */
function normalizeName(name:string):string {
  if (name.substring(0, 1) == '_') {
    return name.substring(1);
  }
  if (name.substring(name.length - 1) == '_') {
    return name.substring(0, name.length - 1);
  }
  // Any other interior underscores are kept
  return name;
}

/**
 * Deep-clone an HTML element
 * Note that element and attribute names with _prefix will be renamed without _
 * @param elmt The original element
 * @param context A dictionary of all accessible values
 * @returns A cloned element
 */
function cloneWithContext(elmt:HTMLElement, context:object):HTMLElement {
  const tagName = normalizeName(elmt.tagName);
  const clone = document.createElement(tagName);
  cloneAttributes(elmt, clone, context);

  for (let i = 0; i < elmt.childNodes.length; i++) {
    const child = elmt.childNodes[i];
    if (child.nodeType == Node.ELEMENT_NODE) {
      const child_elmt = child as HTMLElement;
      if (isTag(child_elmt, 'for')) {
        appendRange(clone, startForLoop(child_elmt, context));
      }
      else if (isTag(child_elmt, 'if')) {
        appendRange(clone, startIfBlock(child_elmt, context));
      }
      else if (isTag(child_elmt, 'use')) {
        appendRange(clone, useTemplate(child_elmt, context));
      }
      else if (isTag(child_elmt, inputAreaTagNames)) {
        appendRange(clone, startInputArea(child_elmt, context));
      }
      else {
        clone.appendChild(cloneWithContext(child_elmt, context));
      }
    }
    else if (child.nodeType == Node.TEXT_NODE) {
      appendRange(clone, cloneTextNode(child as Text, context));
    }
    else {
      clone.insertBefore(cloneNode(child), null);
    }
  }

  return clone;
}

/**
 * Finish cloning an HTML element
 * @param src The element being cloned
 * @param dest The new element, still in need of attributes
 * @param context A dictionary of all accessible values
 */
function cloneAttributes(src:HTMLElement, dest:HTMLElement, context:object) {
  for (let i = 0; i < src.attributes.length; i++) {
    const name = normalizeName(src.attributes[i].name);
    let value = src.attributes[i].value;
    value = cloneText(value, context);
    if (name == 'id') {
      dest.id = value;
    }
    else if (name == 'class') {
      if (value) {
        const classes = value.split(' ');
        for (let i = 0; i < classes.length; i++) {
          if (classes[i].length > 0) {
            dest.classList.add(classes[i]);
          }
        }
      }    
    }
    // REVIEW: special case 'style'?
    else {
      dest.setAttribute(name, value);
    }
  }
}

/**
 * Process a text node which may contain {curly} formatting.
 * @param text A text node
 * @param context A dictionary of all accessible values
 * @returns A list of text nodes
 */
function cloneTextNode(text:Text, context:object):Node[] {
  const dest:Node[] = [];
  let str = text.textContent;
  let i = str ? str.indexOf('{') : -1;
  while (str && i >= 0) {
    const j = str.indexOf('}', i);
    if (j < 0) {
      break;
    }
    if (i > 0) {
      dest.push(document.createTextNode(str.substring(0, i)));
    }
    const key = str.substring(i + 1, j);
    dest.push(document.createTextNode(textFromContext(key, context)));
    str = str.substring(j + 1);
    i = str.indexOf('{');
  }
  if (str) {
    dest.push(document.createTextNode(str));
  }
  return dest;
}

/**
 * Process text which may contain {curly} formatting.
 * @param text Any text
 * @param context A dictionary of all accessible values
 * @returns Expanded text
 */
function cloneText(str:string, context:object):string {
  let dest = '';
  let i = str ? str.indexOf('{') : -1;
  while (str && i >= 0) {
    const j = str.indexOf('}', i);
    if (j < 0) {
      break;
    }
    if (i > 0) {
      dest += str.substring(0, i);
    }
    const key = str.substring(i + 1, j);
    dest += textFromContext(key, context);
    str = str.substring(j + 1);
    i = str.indexOf('{');
  }
  if (str) {
    dest += str;
  }
  return dest;
}

/**
 * Enable lookups into the context by key name.
 * Keys can be paths, separated by dots (.)
 * Paths can have other paths as nested arguments, using [ ]
 * Note, the dot separator is still required.
 *   example: foo.[bar].fuz       equivalent to foo[{bar}].fuz
 *   example: foo.[bar.baz].fuz   equivalent to foo[{bar.baz}].fuz
 * Even arrays use dot notation: foo.0 is the 0th item in foo
 * @param key A key, initially from {curly} notation
 * @param context A dictionary of all accessible values
 * @returns Resolved text
 */
function anyFromContext(key:string, context:object):any {
  key = key.trim();
  if (key[0] == '{' && key[key.length - 1] == '}') {
    // Remove redundant {curly}, since some fields don't require them
    key = key.substring(1, key.length - 2).trim();
  }
  const path = key.split('.');
  const nested = [context];
  for (let i = 0; i < path.length; i++) {
    let step = path[i];
    if (!step) {
      continue;  // Ignore blank steps for now
    }
    const newNest = step[0] == '[';
    if (newNest) {
      step = step.substring(1);
      nested.push(context);
    }
    // steps can end in one more more ']', which can't occur anywhere else
    let unnest = step.indexOf(']');
    if (unnest >= 0) {
      unnest = step.length - unnest;
      if (nested.length <= unnest) {
        throw new Error('Malformed path has unmatched ] : ' + key);
      }
      step = step.substring(0, step.length - unnest);
    }

    if (!(step in nested[nested.length - 1])) {
      if ((i == 0 && path.length == 1) || (newNest && unnest > 0)) {
        nested[nested.length - 1] = new String(step);  // A lone step (or nested step) can be a literal
      }
      else {
        throw new Error('Unrecognized key: ' + step);
      }
    }
    else {
      nested[nested.length - 1] = getKeyedChild(nested[nested.length - 1], step);
    }

    for (; unnest > 0; unnest--) {
      const pop:string = '' + nested.pop();
      nested[nested.length - 1] = getKeyedChild(nested[nested.length - 1], pop);
    }
  }
  if (nested.length > 1) {
    throw new Error('Malformed path has unmatched [ : ' + key);
  }
  return nested.pop();
}

/**
 * Test a key in the current context
 * @param key A key, initially from {curly} notation
 * @param context A dictionary of all accessible values
 * @returns true if key is a valid path within the context
 */
function validateKeyInContet(key:string, context:object) {
  try {
    anyFromContext(key, context);
    return true;
  }
  catch {
    return false;
  }
}

/**
 * Enable lookups into the context by key name.
 * Keys can be paths, separated by dots (.)
 * Paths can have other paths as nested arguments, using [ ]
 * Note, the dot separator is still required.
 *   example: foo.[bar].fuz       equivalent to foo[{bar}].fuz
 *   example: foo.[bar.baz].fuz   equivalent to foo[{bar.baz}].fuz
 * Even arrays use dot notation: foo.0 is the 0th item in foo
 * @param key A key, initially from {curly} notation
 * @param context A dictionary of all accessible values
 * @returns Resolved text
 */
function textFromContext(key:string, context:object):string {
  if (key.indexOf('.') < 0) {
    return key;  // key can be a literal value
  }

  return '' + anyFromContext(key, context);
}


/**
 * Get a keyed child of a parent, where the key is either a dictionary key 
 * or a list index or a string offset.
 * @param parent The parent object: a list, object, or string
 * @param key The identifier of the child: a dictionary key, a list index, or a string offset
 * @returns A child object, or a substring
 */
function getKeyedChild(parent:any, key:string) {
  if (typeof(parent) == 'string') {
    const i = parseInt(key);
    return (parent as string)[i];
  }
  if (!(key in parent)) {
    throw new Error('Unrecognized key: ' + key);
  }
  return parent[key];
}

/**
 * Clone other node types, besides HTML elements and Text
 * @param node Original node
 * @returns A node to use in the clone
 */
function cloneNode(node:Node):Node {
  return node;  // STUB: keep original node
}

/**
 * Replace a <use> tag with the contents of a <template>.
 * Along the way, push any attributes of the <use> tag onto the context.
 * Afterwards, pop them back off.
 * Optionally, a <use> tag without a template="" attribute is a way to modify the context for the use's children.
 * @param node a <use> tag
 * @param context The current context
 * @returns An array of nodes to insert into the document in place of the <use> tag
 */
function useTemplate(node:HTMLElement, context:object):Node[] {
  let dest:Node[] = [];
  const tempId = node.getAttribute('template');
  const template = tempId ? document.getElementById(tempId) : undefined;
  const popContext = {};
  for (var i = 0; i < node.attributes.length; i++) {
    const attr = node.attributes[i].name;
    const val = node.attributes[i].value;
    const attri = node.attributes[i].name.toLowerCase();
    if (attri != 'template' && attri != 'builder_control') {
      popContext[attr] = context[attr];
      context[attr] = anyFromContext(val, context) || val;
    }
  }

  if (tempId) {
    const template = document.getElementById(tempId) as HTMLTemplateElement;
    if (!template) {
      throw new Error('Unresolved template ID: ' + tempId);
    }
    // The template doesn't have any child nodes. Its content must first be cloned.
    const clone = template.content.cloneNode(true) as HTMLElement;
    dest = expandContents(clone, context);
  }
  else {
    dest = expandContents(node, context);
  }

  for (var i = 0; i < node.attributes.length; i++) {
    const attr = node.attributes[i].name.toLowerCase();
    if (attr != 'template' && attr != 'builder_control') {
      context[attr] = popContext[attr];
    }
  }

  return dest;
}