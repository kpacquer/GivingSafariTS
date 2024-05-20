import { appendRange, expandContents } from "./_builder";
import { cloneAttributes, cloneText } from "./_builderContext";
import { applyAllClasses, isTag, toggleClass } from "./_classUtil";
import { getLetterStyles } from "./_textSetup";

export const inputAreaTagNames = [
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
export function startInputArea(src:HTMLElement):Node[] {
  const span = document.createElement('span');

  // Copy most attributes. 
  // Special-cased ones are harmless - no meaning in generic spans
  cloneAttributes(src, span);

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
    literal = ' ';
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
      span.setAttributeNS('', 'data-letter-pattern', cloneText(attr));
    }
    if (attr = src.getAttributeNS('', 'extract')) {
      span.setAttributeNS('', 'data-extract-indeces', cloneText(attr));
    }
    if (attr = src.getAttributeNS('', 'numbers')) {
      span.setAttributeNS('', 'data-number-assignments', cloneText(attr));
    }
  }
  else {
    return [src];  // Unknown tag. NYI?
  }

  let block = src.getAttributeNS('', 'block');  // Used in grids
  if (block) {
    toggleClass(span, 'block', true);
    literal = literal || block;
  }

  if (literal == '¤') {  // Special case (and back-compat)
    toggleClass(span, 'block', true);
    literal = ' ';
  }
  
  if (literal) {
    if (!cloneContents) {
      span.innerText = cloneText(literal);  
    }
    toggleClass(span, 'literal', true);
    applyAllClasses(span, styles.literal);
  }      
  else if (!isTag(src, 'pattern')) {
    applyAllClasses(span, styles.letter);
    if (extract != null) {
      toggleClass(span, 'extract', true);
      if (parseInt(extract) > 0) {
        toggleClass(span, 'numbered', true);
        toggleClass(span, 'extract-numbered', true);
        span.setAttributeNS('', 'data-number', extract);
        
        const under = document.createElement('span');
        toggleClass(under, 'under-number');
        under.innerText = extract;
        span.appendChild(under);
      }
      applyAllClasses(span, styles.extract);
    }
  }

  if (cloneContents) {
    appendRange(span, expandContents(src));
  }

  return [span];
}
