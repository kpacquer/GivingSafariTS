import { textSetup } from "./_textSetup"
import { hasClass, toggleClass } from "./_classUtil"
import { setupNotes, setupCrossOffs, setupHighlights } from "./_notes"
import { setupDecoderToggle } from "./_decoders"
import { checkLocalStorage, indexAllDragDropFields, indexAllDrawableFields } from "./_storage";
import { preprocessStampObjects } from "./_stampTools";
import { preprocessDragFunctions } from "./_dragDrop";
import { EdgeTypes, preprocessRulerFunctions } from "./_straightEdge";
import { TableDetails, constructTable } from "./_tableBuilder";
import { setupSubways } from "./_subway";


/**
 * Cache the URL parameneters as a dictionary.
 * Arguments that don't specify a value receive a default value of true
 */
const urlArgs = {};

/**
 * Scan the url for special arguments.
 */
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
    if (urlArgs['body-debug'] != undefined && urlArgs['body-debug'] !== false) {
        toggleClass(document.getElementsByTagName('body')[0], 'debug', true);
    }
}

/**
 * Determines if the caller has specified <i>debug</i> in the URL
 * @returns true if set, unless explictly set to false
 */
export function isDebug() {
    return urlArgs['debug'] != undefined && urlArgs['debug'] !== false;
}

/**
 * Determines if the caller has specified <i>body-debug</i> in the URL,
 * or else if the puzzle explictly has set class='debug' on the body.
 * @returns true if set, unless explictly set to false
 */
export function isBodyDebug() {
    return hasClass(document.getElementsByTagName('body')[0], 'debug');
}

/**
 * Determines if this document is being loaded inside an iframe.
 * While any document could in theory be in an iframe, this library tags such pages with a url argument.
 * @returns true if this page's URL contains an iframe argument (other than false)
 */
export function isIFrame() {
    return urlArgs['iframe'] != undefined && urlArgs['iframe'] !== false;
}

/**
 * Determines if this document's URL was tagged with ?print
 * This is intended to as an alternative way to get a print-look, other than CSS's @media print
 * @returns true if this page's URL contains a print argument (other than false)
 */
export function isPrint() {
    return urlArgs['print'] != undefined && urlArgs['print'] !== false;
}

/**
 * Special url arg to override any cached storage. Always restarts.
 * @returns true if this page's URL contains a restart argument (other than =false)
 */
export function isRestart() {
    return urlArgs['restart'] != undefined && urlArgs['restart'] !== false;
}

/**
 * Do we want to skip the UI that offers to reload?
 * @returns 
 */
export function forceReload(): boolean|undefined {
    if (urlArgs['reload'] != undefined) {
        return urlArgs['reload'] !== false;
    }
    return undefined;
}

type LinkDetails = {
    rel: string;  // 'preconnect', 'stylesheet', ...
    href: string;
    type?: string;  // example: 'text/css'
    crossorigin?: string;  // if anything, ''
}

type PuzzleEventDetails = {
    title: string;
    logo: string;  // path from root
    icon: string;  // path from root
    puzzleList: string;
    cssRoot: string;  // path from root
    fontCss: string;  // path from root
    googleFonts?: string;  // comma-delimeted list
    links: LinkDetails[];
    qr_folders?: {};  // folder lookup
}

const safariSingleDetails:PuzzleEventDetails = {
    'title': 'Puzzle',
    'logo': './Images/Sample_Logo.png',
    'icon': './Images/Sample_Icon.png',
    'puzzleList': '',
    'cssRoot': '../Css/',
    'fontCss': './Css/Fonts.css',
    'googleFonts': 'Caveat',
    'links': [
//        { rel:'preconnect', href:'https://fonts.googleapis.com' },
//        { rel:'preconnect', href:'https://fonts.gstatic.com', crossorigin:'' },
    ]
}

const safariSampleDetails:PuzzleEventDetails = {
    'title': 'Puzzle Safari',
    'logo': './Images/Sample_Logo.png',
    'icon': './Images/Sample_Icon.png',
    'puzzleList': './index.html',
    'cssRoot': '../Css/',
    'fontCss': './Css/Fonts.css',
    'googleFonts': 'Caveat',
    'links': []
}

const safari20Details:PuzzleEventDetails = {
    'title': 'Safari Labs',
    'logo': './Images/PS20 logo.png',
    'icon': './Images/Beaker_icon.png',
    'puzzleList': './safari.html',
    'cssRoot': '../Css/',
    'fontCss': './Css/Fonts20.css',
    'googleFonts': 'Architects+Daughter,Caveat',
    'links': [],
    'qr_folders': {'https://www.puzzyl.net/23/': './Qr/puzzyl/',
                   'file:///D:/git/GivingSafariTS/23/': './Qr/puzzyl/'},
}

const pastSafaris = {
    'Sample': safariSampleDetails,
    'Single': safariSingleDetails,
    '20': safari20Details,
}

let safariDetails:PuzzleEventDetails;

/**
 * Return the details of this puzzle event
 */
export function getSafariDetails(): PuzzleEventDetails {
    return safariDetails;
}

type AbilityData = {
    notes?: boolean;
    checkMarks?: boolean;
    highlights?: boolean;
    decoder?: boolean;
    decoderMode?: string;
    dragDrop?: boolean;
    stamping?: boolean;
    straightEdge?: boolean;
    wordSearch?: boolean;
    subway?: boolean;
}

type BoilerPlateData = {
    safari: string;  // key for Safari details
    title: string;
    qr_base64: string;
    print_qr: boolean;
    author: string;
    copyright: string;
    type: string;  // todo: enum
    feeder?: string;
    lang?: string;  // en-us by default
    paperSize?: string;  // letter by default
    orientation?: string;  // portrait by default
    textInput?: boolean;  // false by default
    abilities?: AbilityData;  // booleans for various UI affordances
    pathToRoot?: string;  // By default, '.'
    tableBuilder?: TableDetails;  // Arguments to table-generate the page content
    preSetup?: () => void;
    postSetup?: () => void;
    googleFonts?: string;  // A list of fonts, separated by commas
    onNoteChange?: (inp:HTMLInputElement) => void;
    onInputChange?: (inp:HTMLInputElement) => void;
    onRestore?: () => void;
}

/**
 * Do some basic setup before of the page and boilerplate, before building new components
 * @param bp 
 */
function preSetup(bp:BoilerPlateData) {
    safariDetails = pastSafaris[bp.safari];
    debugSetup();
    var bodies = document.getElementsByTagName('BODY');
    if (isIFrame()) {
        bodies[0].classList.add('iframe');
    }
    if (isPrint()) {
        bodies[0].classList.add('print');
    }
    if (bp.pathToRoot) {
        if (safariDetails.logo) { 
            safariDetails.logo = bp.pathToRoot + '/' + safariDetails.logo;
        }
        if (safariDetails.icon) { 
            safariDetails.icon = bp.pathToRoot + '/' + safariDetails.icon;
        }
        if (safariDetails.puzzleList) { 
            safariDetails.puzzleList = bp.pathToRoot + '/' + safariDetails.puzzleList;
        }
    }
}

interface CreateSimpleDivArgs {
    id?: string;
    cls?: string;
    html?: string;
}
function createSimpleDiv({id, cls, html}: CreateSimpleDivArgs) : HTMLDivElement {
    let div: HTMLDivElement = document.createElement('DIV') as HTMLDivElement;
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
    let a: HTMLAnchorElement = document.createElement('A') as HTMLAnchorElement;
    if (id !== undefined) {
        a.id = id;
    }
    if (cls !== undefined) {
        a.classList.add(cls);
    }
    a.innerHTML = friendly;
    a.href = href;
    a.target = target || '_blank';
    return a;
}

/**
 * Map puzzle types to alt text
 */
const iconTypeAltText = {
    'Word': 'Word puzzle',
    'Math': 'Math puzzle',
    'Rebus': 'Rebus puzzle',
    'Code': 'Features encodings',
    'Trivia': 'Trivia puzzle',
    'Meta': 'Meta puzzle',
    'Reassemble': 'Assembly'
}

/**
 * Create an icon appropriate for this puzzle type
 * @param data Base64 image data
 * @returns An img element, with inline base-64 data
 */
function createPrintQrBase64(data:string):HTMLImageElement {
    const qr = document.createElement('img');
    qr.id = 'qr';
    qr.src = 'data:image/png;base64,' + data;
    qr.alt = 'QR code to online page';
    return qr;
}

function getQrPath():string|undefined {
    if (safariDetails.qr_folders) {
        const url = window.location.href;
        for (const key of Object.keys(safariDetails.qr_folders)) {
            if (url.indexOf(key) == 0) {
                const folder = safariDetails.qr_folders[key];
                const names = window.location.pathname.split('/');  // trim off path before last slash
                const name = names[names.length - 1].split('.')[0];  // trim off extension
                return folder + '/' + name + '.png';
            }
        }
    }
    return undefined;
}

function createPrintQr():HTMLImageElement|null {
    // Find relevant folder:
    const path = getQrPath();
    if (path) {
        const qr = document.createElement('img');
        qr.id = 'qr';
        qr.src = path;
        qr.alt = 'QR code to online page';
        return qr;
    }
    return null;
}

/**
 * Create an icon appropriate for this puzzle type
 * @param puzzleType the name of the puzzle type
 * @param icon_use the purpose of the icon
 * @returns A div element, to be appended to the pageWithinMargins
 */
function createTypeIcon(puzzleType:string, icon_use:string=''):HTMLDivElement {
    if (!icon_use) {
        icon_use = 'puzzle';
    }
    const iconDiv = document.createElement('div');
    iconDiv.id = 'icons';
    const icon = document.createElement('img');
    icon.id = 'icons-' + iconDiv.childNodes.length;
    icon.src = './Icons/' + puzzleType.toLocaleLowerCase() + '.png';
    icon.alt = iconTypeAltText[puzzleType] || (puzzleType + ' ' + icon_use);
    iconDiv.appendChild(icon);
    return iconDiv;
}

function boilerplate(bp: BoilerPlateData) {
    if (!bp) {
        return;
    }

    preSetup(bp)

    /* A puzzle doc must have this shape:
     *   <html>
     *    <head>
     *     <script>
     *      const boiler = { ... };        // Most fields are optional
     *     </script>
     *    </head>
     *    <body>
     *     <div id='pageBody'>
     *      // All page contents
     *     </div>
     *    </body>
     *   </html>
     *  
     * Several new objects and attibutes are inserted.
     * Some are univeral; some depend on boiler plate data fields.
     *   <html>
     *    <head></head>
     *    <body class='letter portrait'>            // new classes
     *     <div id='page' class='printedPage'>      // new layer
     *      <div id='pageWithinMargins'>            // new layer
     *       <div id='pageBody'>
     *        // All page contents
     *       </div>
     *       <div id='title'>[title]</div>          // new element
     *       <div id='copyright'>[copyright]</div>  // new element
     *       <a id='backlink'>Puzzle List</a>       // new element
     *      </div>
     *     </div>
     *    </body>
     *   </html>
     */

    if (bp.tableBuilder) {
        constructTable(bp.tableBuilder);
    }

    const html:HTMLHtmlElement = document.getElementsByTagName('HTML')[0] as HTMLHtmlElement;
    const head:HTMLHeadElement = document.getElementsByTagName('HEAD')[0] as HTMLHeadElement;
    const body:HTMLBodyElement = document.getElementsByTagName('BODY')[0] as HTMLBodyElement;
    const pageBody:HTMLDivElement = document.getElementById('pageBody') as HTMLDivElement;

    document.title = bp.title;
    
    html.lang = bp.lang || 'en-us';

    for (var i = 0; i < safariDetails.links.length; i++) {
        addLink(head, safariDetails.links[i]);
    }

    const viewport = document.createElement('META') as HTMLMetaElement;
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1'
    head.appendChild(viewport);

    if (safariDetails.fontCss) {
        linkCss(head, safariDetails.fontCss);
    }
    let gFonts = bp.googleFonts;
    if (safariDetails.googleFonts) {
        gFonts = safariDetails.googleFonts + (gFonts ? (',' + gFonts) : '');
    }
    if (gFonts) {
        //<link rel="preconnect" href="https://fonts.googleapis.com">
        const gapis = {
            'rel': 'preconnect',
            'href': 'https://fonts.googleapis.com'
        };
        addLink(head, gapis);
        //<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        const gstatic = {
            'rel': 'preconnect',
            'href': 'https://fonts.gstatic.com',
            'crossorigin': ''
        };
        addLink(head, gstatic);

        const fonts = gFonts.split(',');
        const link = {
            'href': 'https://fonts.googleapis.com/css2?family=' + fonts.join('&family=') + '&display=swap',
            'rel': 'stylesheet'
        }
        addLink(head, link);
    }
    linkCss(head, safariDetails.cssRoot + 'PageSizes.css');
    linkCss(head, safariDetails.cssRoot + 'TextInput.css');
    if (!bp.paperSize) {
        bp.paperSize = 'letter';
    }
    if (!bp.orientation) {
        bp.orientation = 'portrait';
    }
    if (bp.paperSize.indexOf('|') > 0) {
        const ps = bp.paperSize.split('|');
        bp.paperSize = isPrint() ? ps[1] : ps[0];
    }
    toggleClass(body, bp.paperSize);
    toggleClass(body, bp.orientation);
    toggleClass(body, '_' + bp.safari);  // So event fonts can trump defaults

    const page: HTMLDivElement = createSimpleDiv({id:'page', cls:'printedPage'});
    const margins: HTMLDivElement = createSimpleDiv({cls:'pageWithinMargins'});
    body.appendChild(page);
    page.appendChild(margins);
    margins.appendChild(pageBody);
    margins.appendChild(createSimpleDiv({cls:'title', html:bp.title}));
    margins.appendChild(createSimpleDiv({id:'copyright', html:'&copy; ' + bp.copyright + ' ' + bp.author}));
    if (safariDetails.puzzleList) {
        margins.appendChild(createSimpleA({id:'backlink', href:safariDetails.puzzleList, friendly:'Puzzle list'}));
    }

    // Set tab icon for safari event
    const tabIcon = document.createElement('link');
    tabIcon.rel = 'shortcut icon';
    tabIcon.type = 'image/png';
    tabIcon.href = safariDetails.icon;
    head.appendChild(tabIcon);


    if (bp.qr_base64) {
        margins.appendChild(createPrintQrBase64(bp.qr_base64, ));
    }
    else if (bp.print_qr) {
        const qrImg = createPrintQr();
        if (qrImg) {
            margins.appendChild(qrImg);
        }
    }

    if (bp.type) {
        margins.appendChild(createTypeIcon(bp.type));
    }
    if (bp.feeder) {
        margins.appendChild(createTypeIcon(bp.feeder, 'feeder'));
    }

    // If the puzzle has a pre-setup method they'd like to run before abilities and contents are processed, do so now
    if (bp.preSetup) {
        bp.preSetup();
    }

    if (bp.textInput) {
        textSetup()
    }
    setupAbilities(head, margins, bp.abilities || {});

    if (!isIFrame()) {
        setTimeout(checkLocalStorage, 100);
    }

}

/**
 * Count-down before we know all delay-linked CSS have been loaded
 */
let cssToLoad = 1;

/**
 * Append any link tag to the header
 * @param head the head tag
 * @param det the attributes of the link tag
 */
function addLink(head:HTMLHeadElement, det:LinkDetails) {
    const link = document.createElement('link');
    link.href = det.href;
    link.rel = det.rel;
    if (det.type) {
        link.type = det.type;
    }
    if (det.crossorigin != undefined) {
        link.crossOrigin = det.crossorigin;
    }
    if (det.rel.toLowerCase() == "stylesheet") {
        link.onload = function(){cssLoaded();};
        cssToLoad++;
    }
    head.appendChild(link);
}

/**
 * Append a CSS link to the header
 * @param head the head tag
 * @param relPath The contents of the link's href
 */
function linkCss(head:HTMLHeadElement, relPath:string) {
    const link = document.createElement('link');
    link.href=relPath;
    link.rel = "Stylesheet";
    link.type = "text/css";
    link.onload = function(){cssLoaded();};
    cssToLoad++;
    head.appendChild(link);
}

/**
 * Each CSS file that is delay-linked needs time to load.
 * Decrement the count after each one.
 * When complete, call final setup step.
 */
function cssLoaded() {
    if (--cssToLoad == 0) {
        setupAfterCss(boiler as BoilerPlateData);
    }
}

/**
 * For each ability set to true in the AbilityData, do appropriate setup,
 * and show an indicator emoji or instruction in the bottom corner.
 * Back-compat: Scan the contents of the <ability> tag for known emoji.
 */
function setupAbilities(head:HTMLHeadElement, margins:HTMLDivElement, data:AbilityData) {
    let ability = document.getElementById('ability');
    if (ability != null) {
        const text = ability.innerText;
        if (text.search('✔️') >= 0) {
            data.checkMarks = true;
        }
        if (text.search('💡') >= 0) {
            data.highlights = true;
        }
        if (text.search('👈') >= 0) {
            data.dragDrop = true;
        }
        if (text.search('✒️') >= 0) {
            data.stamping = true;
        }
    }
    else {
        ability = document.createElement('div');
        ability.id = 'ability';
        margins.appendChild(ability);
    }
    let fancy = '';
    let count = 0;
    if (data.checkMarks) {
        setupCrossOffs();
        fancy += '<span id="check-ability" title="Click items to check them off">✔️</span>';
        count++;
    }
    if (data.highlights) {
        let instructions = "Ctrl+click to highlight cells";
        if (boiler?.textInput) {
            instructions = "Type ` or ctrl+click to highlight cells";
        }
        fancy += '<span id="highlight-ability" title="' + instructions + '" style="text-shadow: 0 0 3px black;">💡</span>';
        setupHighlights();
        count++;
    }
    if (data.dragDrop) {
        fancy += '<span id="drag-ability" title="Drag & drop enabled" style="text-shadow: 0 0 3px black;">👈</span>';
        preprocessDragFunctions();
        indexAllDragDropFields();
        linkCss(head, safariDetails.cssRoot + 'DragDrop.css');
        count++;
    }
    if (data.stamping) {
        preprocessStampObjects();
        indexAllDrawableFields();
        linkCss(head, safariDetails.cssRoot + 'StampTools.css');
        // No ability icon
    }
    if (data.straightEdge) {
        fancy += '<span id="drag-ability" title="Line-drawing enabled" style="text-shadow: 0 0 3px black;">📐</span>';
        preprocessRulerFunctions(EdgeTypes.straightEdge, false);
        linkCss(head, safariDetails.cssRoot + 'StraightEdge.css');
        //indexAllVertices();
    }
    if (data.wordSearch) {
        fancy += '<span id="drag-ability" title="word-search enabled" style="text-shadow: 0 0 3px black;">💊</span>';
        preprocessRulerFunctions(EdgeTypes.wordSelect, true);
        linkCss(head, safariDetails.cssRoot + 'WordSearch.css');
        //indexAllVertices();
    }
    if (data.subway) {
        linkCss(head, safariDetails.cssRoot + 'Subway.css');
        // Don't setupSubways() until all styles have applied, so CSS-derived locations are final
    }
    if (data.notes) {
        setupNotes(margins);
        // no ability icon
    }
    if (data.decoder) {
        setupDecoderToggle(margins, data.decoderMode);
    }
    ability.innerHTML = fancy;
    ability.style.bottom = data.decoder ? '-32pt' : '-16pt';
    if (count == 2) {
        ability.style.right = '0.1in';
    }

    // Release our lock on css loading
    cssLoaded();
}

/**
 * All delay-linked CSS files are now loaded. Layout should be complete.
 * @param bp The global boilerplate
 */
function setupAfterCss(bp: BoilerPlateData) {
    if (bp.abilities) {
        if (bp.abilities.subway) {
            setupSubways();
        }
    }

    // If the puzzle has a post-setup method they'd like to run after all abilities and contents are processed, do so now
    if (bp.postSetup) {
        bp.postSetup();
    }
}


declare let boiler: BoilerPlateData | undefined;

/**
 * Expose the boilerplate as an export
 * Only called by code which is triggered by a boilerplate, so safely not null
 */
export function theBoiler():BoilerPlateData {
    return boiler!;
}

window.onload = function(){boilerplate(boiler as BoilerPlateData)};  // error if boiler still undefined