import { textSetup } from "./textSetup"
import { toggleClass } from "./classUtil"


const urlArgs = {};

function debugSetup() {
    var search = window.location.search;
    if (search !== '') {
        search = search.substring(1);  // trim leading ?
        var args = search.split('&');
        for (var i = 0; i < args.length; i++) {
            var toks = args[i].split('=');
            if (toks.length > 1) {
                urlArgs[toks[0].toLowerCase()] = toks[1];
            }
            else {
                urlArgs[toks[0].toLowerCase()] = true;  // e.g. present
            }
        }
    }
}

export function isDebug() {
  return urlArgs['debug'] != undefined && urlArgs['debug'] !== false;
}

export function isIFrame() {
  return urlArgs['iframe'] != undefined && urlArgs['iframe'] !== false;
}

function preSetup() {
  debugSetup();
  if (isIFrame()) {
      var bodies = document.getElementsByTagName('body');
      bodies[0].classList.add('iframe');
  }
}

type BoilerPlateData = {
  title: string;
  author: string;
  copyright: string;
  type: string;  // todo: enum
  paperSize?: string;  // letter by default
  orientation?: string;  // portrait by default
  textInput?: boolean;  // false by default
  storage?: boolean;  // false by default
  notes?: boolean;  // false by default
  dragDrop?: boolean;  // false by default
  decoders?: boolean;  // false by default
}


interface CreateSimpleDivArgs {
  id?: string;
  cls?: string;
  html?: string;
}
function createSimpleDiv({id, cls, html}: CreateSimpleDivArgs) : HTMLDivElement {
  let div: HTMLDivElement = document.createElement('div');
  if (id !== undefined) {
    div.id = id;
  }
  if (cls !== undefined) {
    div.classList.add(cls);
  }
  if (html !== undefined) {
    div.innerHTML = html;
  }
  return div;
}

interface CreateSimpleAArgs {
  id?: string;
  cls?: string;
  friendly: string;
  href: string;
  target?: string;
}
function createSimpleA({id, cls, friendly, href, target}: CreateSimpleAArgs) : HTMLAnchorElement {
  let a: HTMLAnchorElement = document.createElement('a');
  if (id !== undefined) {
    a.id = id;
  }
  if (cls !== undefined) {
    a.classList.add(cls);
  }
  a.innerHTML = friendly;
  a.href = href;
  a.target = target !== null ? target : '_blank';
  return a;
}

function boilerplate(bp: BoilerPlateData) {
  if (bp === null) {
    return;
  }

  const body:HTMLElement = document.getElementsByTagName('body')[0];
  const pageBody:HTMLElement = document.getElementById('pageBody');

  document.title = bp['title'];
  
  toggleClass(body, bp['paperSize'] || 'letter');
  toggleClass(body, bp['orientation'] || 'portrait');

  const page: HTMLDivElement = createSimpleDiv({id:'page', cls:'printedPage'});
  const margins: HTMLDivElement = createSimpleDiv({cls:'pageWithinMargins'});
  body.appendChild(page);
  page.appendChild(margins);
  margins.appendChild(pageBody);
  margins.appendChild(createSimpleDiv({cls:'title', html:bp['title']}));
  margins.appendChild(createSimpleDiv({id:'copyright', html:'&copy; ' + bp['copyright'] + ' ' + bp['author']}));
  margins.appendChild(createSimpleA({id:'backlink', href:'safari.html', friendly:'Puzzle list'}));
  
  if (bp['notes']) {
    margins.appendChild(createSimpleA({id:'notes-toggle', href:'safari.html', friendly:'Show Notes'}));
  }
  if (bp['decoder']) {
    margins.appendChild(createSimpleA({id:'decoder-toggle', href:'https://ambitious-cliff-0dbb54410.azurestaticapps.net/Decoders/', friendly:'Show Decoders'}));
  }

  preSetup()
  
  if (bp['textInput']) {
    textSetup()
  }

  //setTimeout(checkLocalStorage, 100);

}

declare let boiler: any;
window.onload = function(){boilerplate(boiler as BoilerPlateData)};