// Copyright (c) dendr000. MIT License.

// HTML 상용구 — 태그 이름, 속성 이름, 자주 쓰는 속성 값, 특수 문자(엔티티), 자주 쓰는 틀.
// 태그 이름은 `<` 뒤에서 `di` 만 쳐도 `div` 가 뜨게 이름만 둔다(여는 꺾쇠를 제목에 넣으면 `<div ` 를 칠 때 스페이스바
// 자동 치환이 틀을 펼쳐 버린다). 완성된 요소는 아래 틀(`divb`, `ula` 등)로 넣는다.
import { languagePack, t, words } from './common.js'

const TAGS = words(`
  html head body title meta link style script noscript base header nav main section article aside footer
  h1 h2 h3 h4 h5 h6 hgroup div span p br hr pre code blockquote ul ol li dl dt dd a img picture source video audio
  track figure figcaption table caption thead tbody tfoot tr th td colgroup col form fieldset legend label input
  button select option optgroup datalist textarea output progress meter details summary dialog template slot
  canvas svg iframe embed object param map area b strong i em u s mark small sub sup del ins abbr cite q dfn kbd
  samp var time data bdi bdo wbr ruby rt rp address menu
`)

const ATTRIBUTES = words(`
  id class style title lang dir hidden tabindex draggable contenteditable spellcheck translate accesskey
  href target rel download hreflang src srcset sizes alt width height loading decoding crossorigin
  type name value placeholder required readonly disabled checked selected multiple autofocus autocomplete
  min max step minlength maxlength pattern size rows cols wrap for form action method enctype novalidate
  charset content http-equiv viewport async defer integrity nonce media colspan rowspan headers scope
  controls autoplay loop muted poster preload open label role
  onclick ondblclick onchange oninput onsubmit onload onerror onfocus onblur onkeydown onkeyup onkeypress
  onmouseover onmouseout onmouseenter onmouseleave onscroll onresize
  data-id data-name data-value data-target data-toggle aria-label aria-hidden aria-expanded aria-controls
  aria-describedby aria-live aria-current
`)

// type="..." 같은 곳에 쓰는 값
const VALUES = words(`
  text password email number tel url search date time datetime-local month week color range file hidden
  checkbox radio submit reset button image _blank _self _parent _top stylesheet icon preload canonical
  noopener noreferrer nofollow utf-8 UTF-8 width=device-width,initial-scale=1.0 text/css text/javascript
  application/json multipart/form-data application/x-www-form-urlencoded get post lazy eager anonymous
  presentation button dialog alert navigation main banner
`)

const ENTITIES = [
  '&nbsp;', '&lt;', '&gt;', '&amp;', '&quot;', '&apos;', '&copy;', '&reg;', '&trade;', '&hellip;', '&middot;',
  '&bull;', '&larr;', '&rarr;', '&uarr;', '&darr;', '&times;', '&divide;', '&laquo;', '&raquo;', '&euro;',
  '&won;', '&yen;', '&pound;', '&cent;', '&deg;', '&plusmn;', '&infin;', '&ne;', '&le;', '&ge;', '&para;',
  '&sect;', '&check;', '&hearts;',
]

const TEMPLATES = [
  t('html5', '<!DOCTYPE html>', '<html lang="ko">', '<head>', '    <meta charset="UTF-8">', '    <meta name="viewport" content="width=device-width, initial-scale=1.0">', '    <title>{#}</title>', '</head>', '<body>', '    ', '</body>', '</html>'),
  t('doctype', '<!DOCTYPE html>'),
  t('metautf', '<meta charset="UTF-8">'),
  t('metavp', '<meta name="viewport" content="width=device-width, initial-scale=1.0">'),
  t('metadesc', '<meta name="description" content="{#}">'),
  t('metaog', '<meta property="og:title" content="{#}">', '<meta property="og:description" content="">', '<meta property="og:image" content="">'),
  t('linkcss', '<link rel="stylesheet" href="{#}.css">'),
  t('linkicon', '<link rel="icon" href="{#}.ico">'),
  t('scriptsrc', '<script src="{#}.js"></script>'),
  t('scriptdef', '<script src="{#}.js" defer></script>'),
  t('scriptin', '<script>', '    {#}', '</script>'),
  t('stylein', '<style>', '    {#}', '</style>'),
  t('divb', '<div>{#}</div>'),
  t('divc', '<div class="{#}"></div>'),
  t('divid', '<div id="{#}"></div>'),
  t('spanb', '<span>{#}</span>'),
  t('spanc', '<span class="{#}"></span>'),
  t('pb', '<p>{#}</p>'),
  t('h1b', '<h1>{#}</h1>'),
  t('h2b', '<h2>{#}</h2>'),
  t('h3b', '<h3>{#}</h3>'),
  t('aex', '<a href="{#}" target="_blank" rel="noopener noreferrer"></a>'),
  t('ahref', '<a href="{#}"></a>'),
  t('imga', '<img src="{#}" alt="">'),
  t('imgw', '<img src="{#}" alt="" width="" height="">'),
  t('ula', '<ul>', '    <li>{#}</li>', '    <li></li>', '</ul>'),
  t('ola', '<ol>', '    <li>{#}</li>', '    <li></li>', '</ol>'),
  t('lib', '<li>{#}</li>'),
  t('dla', '<dl>', '    <dt>{#}</dt>', '    <dd></dd>', '</dl>'),
  t('tablea', '<table>', '    <thead>', '        <tr>', '            <th>{#}</th>', '            <th></th>', '        </tr>', '    </thead>', '    <tbody>', '        <tr>', '            <td></td>', '            <td></td>', '        </tr>', '    </tbody>', '</table>'),
  t('trb', '<tr>', '    <td>{#}</td>', '    <td></td>', '</tr>'),
  t('formpost', '<form action="{#}" method="post">', '    ', '    <button type="submit">전송</button>', '</form>'),
  t('formget', '<form action="{#}" method="get">', '    ', '</form>'),
  t('formfile', '<form action="{#}" method="post" enctype="multipart/form-data">', '    <input type="file" name="file">', '    <button type="submit">업로드</button>', '</form>'),
  t('inputt', '<input type="text" name="{#}" id="" placeholder="">'),
  t('inputp', '<input type="password" name="{#}" id="">'),
  t('inpute', '<input type="email" name="{#}" id="" required>'),
  t('inputn', '<input type="number" name="{#}" min="0" max="100" step="1">'),
  t('inputc', '<input type="checkbox" name="{#}" id="">'),
  t('inputr', '<input type="radio" name="{#}" value="">'),
  t('inputd', '<input type="date" name="{#}">'),
  t('inputh', '<input type="hidden" name="{#}" value="">'),
  t('inputs', '<input type="submit" value="{#}">'),
  t('labelf', '<label for="{#}"></label>'),
  t('labelin', '<label>', '    {#}', '    <input type="text">', '</label>'),
  t('btn', '<button type="button">{#}</button>'),
  t('btns', '<button type="submit">{#}</button>'),
  t('sel', '<select name="{#}" id="">', '    <option value="">선택</option>', '    <option value="1"></option>', '</select>'),
  t('opt', '<option value="{#}"></option>'),
  t('textar', '<textarea name="{#}" id="" cols="30" rows="5"></textarea>'),
  t('fieldst', '<fieldset>', '    <legend>{#}</legend>', '    ', '</fieldset>'),
  t('navb', '<nav>', '    <ul>', '        <li><a href="{#}"></a></li>', '    </ul>', '</nav>'),
  t('headerb', '<header>', '    {#}', '</header>'),
  t('mainb', '<main>', '    {#}', '</main>'),
  t('sectionb', '<section>', '    <h2>{#}</h2>', '</section>'),
  t('articleb', '<article>', '    {#}', '</article>'),
  t('asideb', '<aside>', '    {#}', '</aside>'),
  t('footerb', '<footer>', '    {#}', '</footer>'),
  t('figureb', '<figure>', '    <img src="{#}" alt="">', '    <figcaption></figcaption>', '</figure>'),
  t('videob', '<video src="{#}" controls></video>'),
  t('audiob', '<audio src="{#}" controls></audio>'),
  t('iframeb', '<iframe src="{#}" width="560" height="315" frameborder="0" allowfullscreen></iframe>'),
  t('detailsb', '<details>', '    <summary>{#}</summary>', '    ', '</details>'),
  t('dialogb', '<dialog>', '    {#}', '</dialog>'),
  t('canvasb', '<canvas id="{#}" width="400" height="300"></canvas>'),
  t('brr', '<br>'),
  t('hrr', '<hr>'),
  t('commt', '<!-- {#} -->'),
  t('cssvar', 'style="{#}"'),
  t('dataattr', 'data-{#}=""'),
  t('onclickh', 'onclick="{#}"'),
  t('bootcdn', '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">', '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>'),
  t('jqcdn', '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>'),
]

export const HTML_PACK = languagePack({
  folder: 'HTML',
  description: 'HTML — 태그·속성·값·특수 문자·틀',
  keywords: [...TAGS, ...ATTRIBUTES, ...VALUES, ...ENTITIES],
  templates: TEMPLATES,
  first: [
    'div', 'span', 'p', 'a', 'img', 'ul', 'li', 'table', 'tr', 'td', 'form', 'input', 'button', 'class', 'id', 'href',
    'src', 'style', 'script', 'link', 'meta', 'title', 'head', 'body', 'html', 'h1', 'h2', 'h3', 'label', 'select',
    'option', 'textarea', 'section', 'header', 'footer', 'nav', 'html5',
    'main', 'article', 'aside', 'h4', 'h5', 'h6', 'br', 'hr', 'ol', 'dl', 'dt', 'dd', 'pre', 'code', 'strong', 'em', 'b', 'i', 'u', 'small', 'sub', 'sup', 'thead', 'tbody', 'th', 'caption', 'fieldset', 'legend', 'video', 'audio', 'iframe', 'canvas', 'svg', 'alt', 'type', 'name', 'value', 'placeholder', 'required', 'disabled', 'checked', 'selected', 'action', 'method', 'target', 'rel', 'width', 'height', 'lang', 'charset', 'content', 'data-id', 'role', 'tabindex', 'onclick', 'onchange', 'onsubmit', 'onload', 'text', 'number', 'email', 'password', 'checkbox', 'radio', 'submit', 'file', 'hidden', 'date',
  ],
})
