const paths = {
  brand:'m4 7 8-4 8 4v10l-8 4-8-4Zm0 0 8 4 8-4M12 11v10M8 5l8 4v5',
  home:'m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7',
  dashboard:'M3 3h7v7H3zM14 3h7v5h-7zM3 14h7v7H3zM14 12h7v9h-7z',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  box:'m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M8 5l9 4v5',
  spool:'M7 4h10M7 20h10M7 4C1 4 1 20 7 20S13 4 7 4Zm10 0c6 0 6 16 0 16M7 8h10M7 12h10M7 16h10',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  activity:'M3 12h4l3-8 4 16 3-8h4',
  search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 4 6 6',
  bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  plus:'M12 5v14M5 12h14',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  'arrow-right':'M4 12h16m-6-6 6 6-6 6',
  'chevron-right':'m9 5 7 7-7 7',
  'arrow-up':'m5 16 7-8 7 8M12 8v13',
  list:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  sprout:'M12 22V12M12 15C3 15 3 7 3 7s9-1 9 8Zm0-4c0-9 9-9 9-9s1 9-9 9',
  check:'m5 12 4 4L19 6',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
  menu:'M4 5h16M4 12h16M4 19h16',
  close:'m6 6 12 12M6 18 18 6',
  edit:'m15 4 5 5M4 16 16 4a2 2 0 0 1 4 4L8 20H4Z',
  trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  print:'M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6zM17 11h1',
  tag:'M3 3h9l9 9-9 9-9-9ZM7 7h.01',
  leaf:'M20 3C4 1-1 18 8 20c8 3 13-7 12-17ZM4 22 16 8',
  money:'M3 5h18v14H3zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 12h.01M18 12h.01',
  filter:'M4 6h16M7 12h10M10 18h4',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.box}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('en-AU', {style:'currency',currency:'AUD', minimumFractionDigits:0, maximumFractionDigits:2}).format(value);
const idCode = (id, type='item') => `${type === 'box' ? 'BX' : 'ST'}-${String(id).padStart(4,'0')}`;
const state = {items:[], boxes:[], locations:[], activity:[], page:'overview', query:'', category:'', location:'', box:'', low:false, tab:'all', sort:'recent', view:'grid'};
const main = document.getElementById('main');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
let toastTimer;
function toast(message) { const el=document.getElementById('toast'); el.textContent=message; el.classList.add('toast'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('toast'),3500); }
async function api(path, method='GET', body) {
  const csrf = document.cookie.split('; ').find(x=>x.startsWith('csrftoken='))?.split('=')[1];
  const response = await fetch(path,{method,headers:{'Content-Type':'application/json','X-CSRFToken':csrf || ''},...(body ? {body:JSON.stringify(body)} : {})});
  let data; try {data=await response.json();} catch {throw new Error('Could not reach the workspace. Please try again.');}
  if(!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
async function refresh() { Object.assign(state,await api('/api/inventory/')); render(); }
const getBox = item => state.boxes.find(b=>b.id===item.box);
const getLocation = item => state.locations.find(l=>l.id===(getBox(item)?.location || item.location));
const place = item => getBox(item)?.name || getLocation(item)?.name || 'Unassigned';
const locationPath = item => [getLocation(item)?.name,getBox(item)?.name].filter(Boolean).join(' / ') || 'Unassigned';
const spoolPercent = item => Math.round(item.remaining_weight/item.total_weight*100);
const lowItems = () => state.items.filter(i=>i.is_low);
function relativeTime(date) { const minutes=Math.max(0,Math.floor((Date.now()-new Date(date))/60000)); return minutes<1?'Just now':minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:`${Math.floor(minutes/1440)}d ago`; }

function productArt(item) {
  const color = /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#8d9c82';
  const type = item.kind==='filament'?'spool':item.art;
  const uid = `a${item.id || 'new'}${Math.random().toString(36).slice(2,7)}`;
  const head = `<svg class="product-art" viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${uid}bg" x2=".8" y2="1"><stop stop-color="#f4f2eb"/><stop offset="1" stop-color="#e5e8de"/></linearGradient><linearGradient id="${uid}body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".65"/></linearGradient><linearGradient id="${uid}dark" x2=".7" y2="1"><stop stop-color="#555b52"/><stop offset="1" stop-color="#252b26"/></linearGradient><radialGradient id="${uid}lens"><stop stop-color="#354c49"/><stop offset=".35" stop-color="#182b2a"/><stop offset=".6" stop-color="#53716c"/><stop offset=".67" stop-color="#1a2322"/><stop offset="1" stop-color="#101816"/></radialGradient><filter id="${uid}shadow"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="300" height="220" fill="url(#${uid}bg)"/><ellipse cx="153" cy="180" rx="77" ry="9" fill="#526049" opacity=".14" filter="url(#${uid}shadow)"/>`;
  let body='';
  if(type==='spool') {
    body=`<g transform="translate(7,0) rotate(-13 150 110)"><ellipse cx="178" cy="108" rx="54" ry="73" fill="#43473f"/><ellipse cx="181" cy="108" rx="49" ry="69" fill="#62655a"/><path d="M111 42h68v134h-68z" fill="${color}"/>`;
    for(let x=116;x<179;x+=4) body+=`<path d="M${x} 43q-24 67 0 132" fill="none" stroke="#172a20" stroke-opacity=".12" stroke-width="1"/>`;
    body+=`<ellipse cx="113" cy="109" rx="56" ry="74" fill="#4b5047"/><ellipse cx="111" cy="108" rx="51" ry="68" fill="#d5d2bd"/><ellipse cx="111" cy="108" rx="45" ry="61" fill="#bbbba6"/><ellipse cx="111" cy="108" rx="41" ry="56" fill="#d7d6c2"/><g fill="#656b5b"><path d="M98 59q-20 8-25 32l19 6q1-14 13-22Z"/><path d="M128 61q19 15 22 35l-19 6q-1-14-12-25Z"/><path d="m91 120-19 4q3 25 24 33l9-17q-12-6-14-20Z"/><path d="m132 119 19 1q-2 26-22 38l-10-19q13-7 13-20Z"/></g><ellipse cx="111" cy="109" rx="19" ry="25" fill="#858c77"/><ellipse cx="111" cy="109" rx="12" ry="17" fill="#343d31"/><path d="M102 48q10-3 20 1" stroke="#ebe9d8" stroke-width="3" fill="none"/><text x="111" y="177" fill="#565e4e" font-size="6" text-anchor="middle" font-family="sans-serif">${esc(item.material || 'PLA')} · ${esc(item.diameter || '1.75')} mm</text></g>`;
  } else if(type==='camera') {
    body=`<g transform="rotate(-9 150 110)"><path d="M63 88h173v76H63z" fill="#242b27"/><rect x="66" y="88" width="167" height="69" rx="12" fill="url(#${uid}dark)"/><path d="m115 87 9-21h42l12 21" fill="#303a33"/><rect x="72" y="75" width="25" height="15" rx="4" fill="#252d27"/><rect x="185" y="76" width="35" height="11" rx="4" fill="#353e36"/><rect x="69" y="97" width="36" height="60" rx="9" fill="#353e35"/><path d="M79 101v49M84 100v52M90 100v52" stroke="#495045" stroke-width="2"/><rect x="112" y="89" width="56" height="8" fill="#313930"/><text x="140" y="94" fill="#d7dfd3" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold">SONY</text><text x="208" y="104" fill="#e1e5da" font-size="10" font-family="serif">α</text><circle cx="158" cy="132" r="43" fill="#212924"/><circle cx="158" cy="132" r="37" fill="#4c5148"/><circle cx="158" cy="132" r="34" fill="#1e2b25"/><circle cx="158" cy="132" r="29" fill="#59665b"/><circle cx="158" cy="132" r="26" fill="url(#${uid}lens)"/><ellipse cx="151" cy="124" rx="6" ry="10" fill="#9dac99" opacity=".25"/><path d="M131 154a34 34 0 0 0 52-23" fill="none" stroke="#727a68" stroke-width="2"/><circle cx="102" cy="93" r="3" fill="#d1d6cb"/></g>`;
  } else if(type==='drill') {
    body=`<g transform="translate(5,1) rotate(-13 150 110)"><path d="m87 63 17-7h64l15 14v40l-19 10-8 52h-39l10-56-35-7Z" fill="url(#${uid}body)"/><path d="m151 114 14 7-7 50h-36l9-49Z" fill="#3e4639"/><path d="m111 162 52 1 13 14v13H98v-19Z" fill="#343e33"/><path d="m105 175 65 1" stroke="#879b65" stroke-width="5"/><path d="M177 69h28v36h-28z" fill="#4b5248"/><path d="M204 76h19v23h-19z" fill="#747c6c"/><path d="M224 85h36v5h-36z" fill="#6a7268"/><path d="M218 80v16M212 79v18M190 72v29M183 71v33" stroke="#242d24" stroke-width="3"/><rect x="107" y="69" width="43" height="22" rx="3" fill="#414b38"/><text x="128" y="83" text-anchor="middle" fill="#e5eadf" font-size="7" font-weight="bold" font-family="sans-serif">18V POWER</text><path d="M101 97h44M103 102h37" stroke="#536842" stroke-width="2"/><path d="m163 119 11 3-4 15h-9" fill="#344031"/></g>`;
  } else if(type==='headphones') {
    body=`<g transform="rotate(12 150 110)"><path d="M91 123V96c0-80 118-80 118 0v27" fill="none" stroke="#474d40" stroke-width="21"/><path d="M91 105V92c0-69 118-69 118 0v13" fill="none" stroke="${color}" stroke-width="15"/><path d="M94 91c1-60 111-59 112 0" fill="none" stroke="#dad5c4" stroke-width="5"/><rect x="77" y="107" width="34" height="65" rx="15" fill="#3c4437"/><rect x="84" y="104" width="30" height="64" rx="14" fill="${color}"/><rect x="187" y="107" width="34" height="65" rx="15" fill="#3c4437"/><rect x="183" y="104" width="30" height="64" rx="14" fill="${color}"/><path d="M94 119v35M198 119v35" stroke="#e7dfcc" stroke-width="2" opacity=".6"/><rect x="110" y="114" width="8" height="46" rx="4" fill="#555d4d"/><rect x="179" y="114" width="8" height="46" rx="4" fill="#555d4d"/></g>`;
  } else if(type==='cables') {
    body=`<g transform="rotate(-18 150 110)" fill="none" stroke-linecap="round"><path d="M108 143C39 63 216 20 221 111c4 65-142 90-143 11-1-63 128-87 130-23 3 56-116 71-112 14 3-47 96-62 96-14 0 44-79 53-79 16" stroke="#647160" stroke-width="9"/><path d="M108 143C39 63 216 20 221 111c4 65-142 90-143 11-1-63 128-87 130-23 3 56-116 71-112 14 3-47 96-62 96-14 0 44-79 53-79 16" stroke="#a0aa96" stroke-width="2"/><path d="m113 113 7 40m-12-10 35 31" stroke="#647160" stroke-width="8"/><rect x="110" y="147" width="18" height="30" rx="5" fill="#48573f" stroke="none"/><rect x="113" y="172" width="12" height="11" rx="3" fill="#a6ad9e" stroke="none"/><rect x="136" y="164" width="18" height="30" rx="5" fill="#48573f" stroke="none"/><rect x="139" y="188" width="12" height="11" rx="3" fill="#a6ad9e" stroke="none"/><rect x="82" y="100" width="27" height="14" rx="3" fill="#c8c6b0" stroke="none"/></g>`;
  } else if(type==='keyboard') {
    body=`<g transform="translate(40,68) rotate(-12 110 50)"><rect width="225" height="103" rx="10" fill="#787f6a"/><rect width="225" height="96" rx="10" fill="#c3c4b2"/>`;
    for(let row=0;row<4;row++)for(let col=0;col<12;col++)body+=`<rect x="${8+col*17.5}" y="${8+row*17}" width="15" height="14" rx="2" fill="${col===0||col===11?'#929d86':'#e7e5d7'}"/><path d="M${12+col*17.5} ${13+row*17}h3" stroke="#a8af9a" stroke-width="1"/>`;
    body+=`<rect x="8" y="77" width="35" height="12" rx="2" fill="#939f88"/><rect x="49" y="77" width="108" height="12" rx="2" fill="#e7e5d7"/><rect x="162" y="77" width="53" height="12" rx="2" fill="#939f88"/></g>`;
  } else if(type==='tools') {
    body=`<g transform="rotate(-12 150 115)"><rect x="61" y="59" width="178" height="120" rx="13" fill="#424f3c"/><rect x="66" y="63" width="168" height="110" rx="9" fill="#849379"/><rect x="74" y="71" width="95" height="94" rx="5" fill="#53624b"/>`;
    for(let row=0;row<3;row++)for(let col=0;col<7;col++)body+=`<rect x="${80+col*12}" y="${80+row*27}" width="6" height="18" rx="2" fill="#c5c9b9"/><path d="M${83+col*12} ${77+row*27}v6" stroke="#8b9980" stroke-width="2"/>`;
    body+=`<rect x="185" y="80" width="21" height="71" rx="7" fill="#d2ccb5"/><rect x="187" y="85" width="17" height="29" rx="3" fill="#48573d"/><rect x="193" y="148" width="5" height="16" rx="1" fill="#bac1af"/></g>`;
  } else body=`<g transform="translate(0,4)"><path d="m72 80 77-36 79 35-79 37Z" fill="${color}"/><path d="m72 80 77 36v76l-77-40Z" fill="${color}"/><path d="m149 116 79-37v75l-79 38Z" fill="${color}"/><path d="m149 116 79-37v75l-79 38Z" fill="#253522" opacity=".15"/><path d="m110 62 77 35v28l-18 9v-29l-78-35Z" fill="#e3ddc7" opacity=".6"/><path d="m91 126 36 18v19l-36-18Z" fill="#f1eddf"/><path d="m97 137 23 12m-23-7 16 8" stroke="#9fA58f" stroke-width="2"/></g>`;
  return head+body+'</svg>';
}
function shelfArt() { return `<svg class="shelf-art" viewBox="0 0 250 120" fill="none" aria-hidden="true"><ellipse cx="125" cy="111" rx="101" ry="5" fill="#d5deca"/><path d="M28 49h194M28 103h194" stroke="#8e9d7b" stroke-width="5" stroke-linecap="round"/><path d="M36 50v60M214 50v60" stroke="#a7b397" stroke-width="5"/><rect x="45" y="64" width="50" height="37" rx="3" fill="#c1b593"/><path d="M67 64h9v37" fill="#ded3b4"/><rect x="106" y="73" width="44" height="28" rx="3" fill="#adbba0"/><rect x="116" y="81" width="24" height="8" rx="2" fill="#d5dccb"/><path d="M171 67h24l-3 34h-18z" fill="#d0c4a8"/><path d="M183 68V39m0 18c-14 0-17-13-17-13s15 1 17 13m0-11c0-15 15-18 15-18s-2 15-15 18" fill="#8fa880" stroke="#8fa880" stroke-width="2"/><rect x="52" y="22" width="43" height="24" rx="3" fill="#b1bf9e"/><rect x="65" y="28" width="18" height="5" rx="2" fill="#dce4d3"/><path d="M118 46V18h10v28M131 46V10h8v36m4 0V20h12v26" fill="#a4b696"/><path d="m161 46-5-29 8-2 5 31" fill="#cabd9f"/><rect x="181" y="26" width="21" height="19" rx="4" fill="#859a79"/><path d="M185 27v-8h13v8" stroke="#a7b797" stroke-width="3"/></svg>`; }

function intro(title, description, eyebrow='YOUR WORKSPACE', button='Add item', action='add-item') {
  return `<div class="page-intro"><div><div class="eyebrow">${eyebrow}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="intro-actions"><a class="btn export-button" href="/export.csv">${icon('download')}Export</a><button class="btn btn-primary" data-action="${action}">${icon('plus')}${button}</button></div></div>`;
}
function stats() {
  const spools=state.items.filter(i=>i.kind==='filament');
  const total=state.items.reduce((sum,i)=>sum+i.quantity,0);
  const value=state.items.reduce((sum,i)=>sum+Number(i.value)*i.quantity,0);
  const cards=[['Total items',total,'grid',`${state.items.length} unique entries`,'Everything, accounted for'],['Organized boxes',state.boxes.length,'box',`${state.locations.length} locations`,'A home for every item'],['Filament spools',spools.length,'spool',`${(spools.reduce((s,i)=>s+i.remaining_weight,0)/1000).toFixed(2)} kg remaining`,'Ready for your next idea'],['Inventory value',money(value),'money','AUD · estimated value','Know what you own']];
  return `<section class="stats" aria-label="Workspace statistics">${cards.map(([label,num,ico,foot,sub])=>`<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon(ico)}</span></div><div class="stat-number">${num}</div><div class="stat-foot">${icon('check')}<span class="positive">${foot}</span></div></div>`).join('')}</section>`;
}
function status(item) { return `<span class="status ${item.is_low?'low':''}"><i></i>${item.is_low?'Running low':item.kind==='filament'?'Ready to print':'In stock'}</span>`; }
function card(item) {
  return `<article class="item-card" tabindex="0" role="button" aria-label="View ${esc(item.name)}" data-item="${item.id}"><div class="card-art">${productArt(item)}<span class="category-tag">${esc(item.kind==='filament'?`${item.material} filament`:item.category)}</span><button class="card-favorite ${item.favorite?'selected':''}" data-favorite="${item.id}" aria-label="${item.favorite?'Unfavorite':'Favorite'} ${esc(item.name)}" aria-pressed="${item.favorite}">${icon('star')}</button></div><div class="card-body"><h3 class="card-title">${esc(item.name)}</h3><div class="card-subtitle">${icon('box')} ${esc(place(item))}</div><div class="card-meta"><span>${item.kind==='filament'?`${item.remaining_weight.toLocaleString()} g <span style="color:#afb5a7">/ ${(item.total_weight/1000).toLocaleString()} kg</span>`:`${item.quantity} ${item.quantity===1?'item':'items'} <span style="color:#bdc3b5">·</span> ${idCode(item.id)}`}</span>${status(item)}</div>${item.kind==='filament'?`<div class="weight-progress ${item.is_low?'low':''}"><span style="width:${spoolPercent(item)}%;background:${esc(item.is_low?'#c29a5f':item.color)}"></span></div>`:''}</div></article>`;
}
function empty(title='Nothing here just yet',description='Give your things a home. Add your first item to get started.',action=true) {return `<div class="empty-state"><span>${icon('box')}</span><h3>${esc(title)}</h3><p>${esc(description)}</p>${action?`<button class="btn btn-primary" data-action="add-item">${icon('plus')}Add your first item</button>`:''}</div>`;}
function activityRow(activity,full=false) {return `<div class="activity-row"><span class="activity-icon">${icon(activity.kind==='filament'?'spool':activity.kind==='location'?'pin':activity.kind==='box'?'box':'plus')}</span><div><strong>${esc(activity.title)}</strong><small>${esc(full?(activity.detail||'Workspace updated'):relativeTime(activity.created_at))}</small></div>${full?`<time class="activity-time" title="${esc(new Date(activity.created_at).toLocaleString())}">${relativeTime(activity.created_at)}</time>`:''}</div>`;}
function rightPanel() {
  const low=lowItems();
  return `<aside class="right-panel"><section class="workshop-card"><div class="eyebrow">A LITTLE SPACE, A LOT OF POSSIBILITY</div><h3>Find your things.<br>Make more things.</h3><p>Your next great idea starts with knowing what you have.</p>${shelfArt()}<a href="#filaments" class="btn">Explore your filaments ${icon('arrow-right')}</a></section><section class="panel"><div class="section-heading"><h2>Needs a little attention</h2><span class="badge-count">${low.length}</span></div>${low.length?low.slice(0,3).map(item=>`<div class="alert-row" data-item="${item.id}" tabindex="0" role="button"><span class="mini-art">${productArt(item)}</span><div><strong>${esc(item.name)}</strong><small>${item.kind==='filament'?`${esc(item.material)} · ${esc(item.brand)}`:esc(item.category)}</small></div><span>${item.kind==='filament'?`${item.remaining_weight} g`:`${item.quantity} left`}</span></div>`).join(''):'<p class="info-copy" style="font-size:11px">All stocked up. Your workspace is in good shape.</p>'}<button class="panel-link" style="width:100%" data-action="low-stock">View stock levels ${icon('arrow-right')}</button></section><section class="panel"><div class="section-heading"><h2>Little updates</h2>${icon('clock')}</div>${state.activity.slice(0,3).map(a=>activityRow(a)).join('')||'<p class="info-copy">Your activity will appear here.</p>'}<a href="#activity" class="panel-link">All activity ${icon('arrow-right')}</a></section></aside>`;
}
function tabs() { return `<div class="tabs" aria-label="Inventory type">${[['all','All items'],['item','Items'],['filament','Filaments']].map(([key,label])=>`<button data-tab="${key}" class="${state.tab===key?'active':''}" aria-pressed="${state.tab===key}">${label}${key==='all'?`<span class="tab-count">${state.items.length}</span>`:''}</button>`).join('')}</div>`; }
function viewToggle() {return `<div class="view-toggle"><button class="${state.view==='grid'?'active':''}" data-view="grid" aria-label="Grid view">${icon('grid')}</button><button class="${state.view==='list'?'active':''}" data-view="list" aria-label="List view">${icon('list')}</button></div>`;}
function filteredItems() {
  let items=state.items.filter(i=>(state.page!=='filaments'||i.kind==='filament')&&(state.page!=='favorites'||i.favorite)&&(state.tab==='all'||i.kind===state.tab)&&(!state.low||i.is_low)&&(!state.box||i.box===Number(state.box))&&(!state.location||getLocation(i)?.id===Number(state.location))&&(!state.category||i.category===state.category));
  if(state.query) {const terms=state.query.toLowerCase().trim().split(/\s+/);items=items.filter(i=>{const searchable=[i.name,i.category,i.material,i.brand,i.notes,locationPath(i),idCode(i.id)].join(' ').toLowerCase();return terms.every(t=>searchable.includes(t));});}
  if(state.sort==='name')items.sort((a,b)=>a.name.localeCompare(b.name));
  else if(state.sort==='value')items.sort((a,b)=>Number(b.value)*b.quantity-Number(a.value)*a.quantity);
  else if(state.sort==='weight')items.sort((a,b)=>a.remaining_weight-b.remaining_weight);
  else if(state.page==='overview'){
    items.sort((a,b)=>a.id-b.id);
    if(state.tab==='all'){
      const ordinary=items.filter(i=>i.kind==='item'),filaments=items.filter(i=>i.kind==='filament');
      items=[];for(let n=0;n<Math.max(ordinary.length,filaments.length);n++){if(ordinary[n])items.push(ordinary[n]);if(filaments[n])items.push(filaments[n]);}
    }
  }
  else items.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  return items;
}
function collection(items,full=false) {
  if(!items.length)return empty(state.items.length?'No items found':'A fresh start for your space',state.items.length?'Try a different search or filter, or add something new.':'Add your first item, box, or spool. A more organized space starts here.',!state.items.length);
  if(state.view==='list')return `<div class="table-wrap"><table class="inventory-table"><thead><tr><th>ITEM</th><th>LOCATION</th><th>QUANTITY / WEIGHT</th><th>STATUS</th><th>VALUE</th></tr></thead><tbody>${items.map(i=>`<tr data-item="${i.id}" tabindex="0" role="button" aria-label="View ${esc(i.name)}"><td><span class="mini-art">${productArt(i)}</span>${esc(i.name)}</td><td>${esc(place(i))}</td><td>${i.kind==='filament'?`${i.remaining_weight} g`:i.quantity}</td><td>${status(i)}</td><td>${money(Number(i.value)*i.quantity)}</td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="item-grid ${full?'full-grid':''}">${items.map(card).join('')}</div>`;
}
function renderOverview() {
  const items=filteredItems();
  return `${intro('A place for everything.','A clear space. A clear mind. Here’s what’s in yours.')}${stats()}<div class="dashboard-layout"><div><section><div class="section-heading"><div><h2>Your inventory</h2><p>All the things that make your space, yours.</p></div><a class="view-all" href="#inventory">View all ${icon('arrow-right')}</a></div><div class="inventory-toolbar">${tabs()}<div class="toolbar-right">${viewToggle()}</div></div>${collection(items.slice(0,6))}<div class="collection-footer"><span>Showing ${Math.min(items.length,6)} of ${items.length} entries</span><a href="#inventory">A look at everything ${icon('arrow-right')}</a></div></section><div class="section-bottom"><span>${icon('leaf')}</span><p><strong>Good things, well kept.</strong><br>A label today saves a search tomorrow.</p><button data-action="label-help">Try item labels ↗</button></div></div>${rightPanel()}</div>`;
}
function filterRow() {
  return `<div class="filter-row"><label class="local-search">${icon('search')}<input id="local-search" aria-label="Search items" placeholder="Search names, labels, materials..." value="${esc(state.query)}"></label><select id="location-filter" aria-label="Filter by location"><option value="">All locations</option>${state.locations.map(l=>`<option value="${l.id}" ${String(l.id)===state.location?'selected':''}>${esc(l.name)}</option>`).join('')}</select><select id="category-filter" aria-label="Filter by category"><option value="">All categories</option>${[...new Set(state.items.map(i=>i.category))].sort().map(c=>`<option ${c===state.category?'selected':''}>${esc(c)}</option>`).join('')}</select><button class="filter-chip ${state.low?'active':''}" data-action="toggle-low">${state.low?'✓ ':''}Low stock</button>${state.query||state.location||state.category||state.box||state.low?'<button class="filter-chip" data-action="clear-filters">Clear filters</button>':''}</div>`;
}
function renderInventory() {
  const filament=state.page==='filaments',favorite=state.page==='favorites';
  const title=filament?'From spool to possibility.':favorite?'Your everyday favorites.':'Everything, in its place.';
  const subtitle=filament?'Know your materials. Track every gram. Keep the ideas flowing.':favorite?'The things you reach for, always within reach.':'Find it, track it, and know exactly where it belongs.';
  let body=intro(title,subtitle,filament?'THE PRINT STATION':favorite?'CLOSE AT HAND':'YOUR INVENTORY',filament?'Add spool':'Add item',filament?'add-filament':'add-item');
  if(filament) {const spools=state.items.filter(i=>i.kind==='filament');body+=`<div class="filament-summary"><span>${icon('spool')}</span><div><h3>${spools.length} spools. Endless possibilities.</h3><p>${new Set(spools.map(i=>i.material)).size} materials in your collection · ${spools.filter(i=>i.is_low).length} spools running low</p></div><div class="summary-weight">${(spools.reduce((s,i)=>s+i.remaining_weight,0)/1000).toFixed(2)} <small>kg left</small></div></div>`;}
  body+=filterRow();
  body+=`<div class="inventory-toolbar">${filament?`<span style="font-size:11px;color:#8c9b80">Your filament collection</span>`:tabs()}<div class="toolbar-right"><select id="sort-order" aria-label="Sort items">${[['recent','Recently updated'],['name','Name: A–Z'],['value','Highest value'],...(filament?[['weight','Lowest weight']]:[])].map(([v,l])=>`<option value="${v}" ${state.sort===v?'selected':''}>${l}</option>`).join('')}</select>${viewToggle()}</div></div><div id="collection-results">${collection(filteredItems(),true)}</div><div class="collection-footer" id="results-count">${filteredItems().length} entries${state.box?` in ${esc(state.boxes.find(b=>b.id===Number(state.box))?.name||'box')}`:''}</div>`;
  return body;
}
function boxCard(box) {
  const items=state.items.filter(i=>i.box===box.id),location=state.locations.find(l=>l.id===box.location);
  return `<article class="box-card" data-box="${box.id}" tabindex="0" role="button" aria-label="Open ${esc(box.name)}"><div class="box-illustration">${productArt({id:`b${box.id}`,color:box.color,art:'object'})}</div><div class="box-info"><h3>${esc(box.name)}</h3><p>${esc(location?.name||'Unassigned')} <span style="float:right;font-size:9px">${idCode(box.id,'box')}</span></p><div class="card-meta"><span>${items.reduce((s,i)=>s+i.quantity,0)} items inside</span><span>${money(items.reduce((s,i)=>s+Number(i.value)*i.quantity,0))}</span></div></div></article>`;
}
function renderBoxes() {return `${intro('Small boxes. Big peace of mind.','Give everything a home, and remember what’s inside.','YOUR BOXES','Add box','add-box')}<div class="box-grid">${state.boxes.map(boxCard).join('')||empty('Your first box is waiting','Create a box to start grouping items by where you keep them.',false)}</div>`;}
function renderLocations() {return `${intro('A little map of your world.','From the workshop to the top shelf. Know where everything lives.','YOUR PLACES','Add location','add-location')}<div class="location-grid">${state.locations.map(l=>{const boxes=state.boxes.filter(b=>b.location===l.id),items=state.items.filter(i=>getLocation(i)?.id===l.id);return `<article class="location-card" data-location="${l.id}" tabindex="0" role="button" aria-label="View ${esc(l.name)}"><div class="location-top"><span class="location-icon">${icon('pin')}</span>${icon('arrow-right')}</div><h3>${esc(l.name)}</h3><p>${esc(l.description||'A home for your things.')}</p><div class="card-meta"><span>${boxes.length} boxes</span><span>${items.reduce((s,i)=>s+i.quantity,0)} items</span></div></article>`;}).join('')||empty('Every space starts somewhere','Add your studio, garage, or any place you keep things.',false)}</div>`;}
function renderActivity() {return `${intro('The little things, remembered.','A history of what’s been added, updated, and put to good use.','WORKSPACE ACTIVITY')}<div class="activity-list">${state.activity.map(a=>activityRow(a,true)).join('')||empty('A quiet workspace','Your additions, changes, and print usage will appear here.',false)}</div><p class="field-hint" style="margin-top:16px">Showing the latest 60 workspace updates.</p>`;}
function render() {
  const pages={overview:'Overview',inventory:'All inventory',boxes:'Boxes',filaments:'Filaments',locations:'Locations',favorites:'Favorites',activity:'Activity'};
  if(!pages[state.page])state.page='overview';
  document.title=`${pages[state.page]} · StoreIt`;
  document.getElementById('breadcrumb-page').textContent=pages[state.page];
  document.getElementById('inventory-count').textContent=state.items.length;
  document.getElementById('alert-dot').hidden=!lowItems().length;
  document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===state.page);a.setAttribute('aria-current',a.dataset.page===state.page?'page':'false');});
  main.innerHTML=state.page==='overview'?renderOverview():state.page==='boxes'?renderBoxes():state.page==='locations'?renderLocations():state.page==='activity'?renderActivity():renderInventory();
}
function navigate(page,filters={}) {
  Object.assign(state,{page,query:'',category:'',location:'',box:'',low:false,tab:'all',sort:'recent'},filters);
  document.getElementById('global-search').value=state.query;
  history.replaceState(null,'',`#${page}`);render();document.getElementById('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'instant'});
}
function modalHeader(title, subtitle='') {return `<header class="modal-header"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>`;}
function showModal(html) {modalContent.innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0;const heading=modalContent.querySelector('h2');if(heading){heading.id='dialog-title';modal.setAttribute('aria-labelledby','dialog-title');}}
function field(label,name,value='',type='text',extras='') {return `<label class="field ${name==='name'||name==='notes'?'full':''}">${label}<input type="${type}" name="${name}" value="${esc(value)}" ${extras}></label>`;}
function selectField(label,name,options,value='',full=false) {return `<label class="field ${full?'full':''}">${label}<select name="${name}">${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;}
function itemForm(item=null,kind='item') {
  const editing=!!item;kind=item?.kind||kind;
  const i=item||{name:'',kind,category:kind==='filament'?'3D printing':'Other',quantity:1,min_quantity:0,value:0,color:'#78936c',total_weight:1000,remaining_weight:1000,low_weight:200,diameter:'1.75',art:kind==='filament'?'spool':'object'};
  const locationOptions=[['','No location yet'],...state.locations.map(l=>[`location:${l.id}`,l.name]),...state.boxes.map(b=>[`box:${b.id}`,`${state.locations.find(l=>l.id===b.location)?.name} / ${b.name}`])];
  const common=field('Name','name',i.name,'text','required maxlength="160" placeholder="Give it a name you’ll remember"')+selectField('Where does it live?','storage',locationOptions,i.box?`box:${i.box}`:i.location?`location:${i.location}`:'',true);
  const regular=selectField('Category','category',['Electronics','Photography','Tools','Home','Outdoor','Crafts','Other',i.category].filter((v,n,a)=>a.indexOf(v)===n).map(x=>[x,x]),i.category)+selectField('Illustration','art',[['object','Storage box'],['camera','Camera'],['headphones','Headphones'],['drill','Power tool'],['cables','Cables'],['tools','Tool set'],['keyboard','Keyboard']],i.art)+field('Quantity','quantity',i.quantity,'number','min="0" max="1000000" step="1" required')+field('Low-stock alert at','min_quantity',i.min_quantity,'number','min="0" max="1000000" step="1" required');
  const spool=field('Brand','brand',i.brand||'','text','maxlength="80" placeholder="e.g. Bambu Lab"')+selectField('Material','material',['PLA','PLA+','PETG','ABS','ASA','TPU','Nylon','PC','PVA','Other',i.material].filter(Boolean).filter((v,n,a)=>a.indexOf(v)===n).map(x=>[x,x]),i.material||'PLA')+field('Full spool weight (g)','total_weight',i.total_weight,'number','min="1" max="100000" step="1" required')+field('Remaining weight (g)','remaining_weight',i.remaining_weight,'number','min="0" step="1" required')+field('Low-stock alert at (g)','low_weight',i.low_weight,'number','min="0" step="1" required')+selectField('Diameter','diameter',[['1.75','1.75 mm'],['2.85','2.85 mm']],i.diameter);
  showModal(`<form id="item-form" data-id="${i.id||''}" data-kind="${kind}">${modalHeader(editing?'Edit '+(kind==='filament'?'spool':'item'):kind==='filament'?'A new spool of possibility.':'Make room for something new.',kind==='filament'?'Each spool gets its own record. Track every gram.':'A few details now. Less searching later.')}<div class="modal-body"><div class="form-error" role="alert"></div>${!editing?`<div class="tabs" style="margin-bottom:22px;width:max-content"><button type="button" data-new-kind="item" class="${kind==='item'?'active':''}">Everyday item</button><button type="button" data-new-kind="filament" class="${kind==='filament'?'active':''}">Filament spool</button></div>`:''}<div class="form-grid">${common}${kind==='filament'?spool:regular}${field(kind==='filament'?'Spool cost (AUD)':'Unit value (AUD)','value',i.value,'number','min="0" max="99999999.99" step="0.01" required')}${field('Color','color',i.color,'color')}<label class="field full">Notes<textarea name="notes" maxlength="2000" placeholder="The little details worth remembering...">${esc(i.notes||'')}</textarea></label></div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">${icon('check')}${editing?'Save changes':kind==='filament'?'Add spool':'Add item'}</button></div></form>`);
}
function boxForm(box=null) {
  if(!state.locations.length){locationForm(null,true);return;}
  showModal(`<form id="box-form" data-id="${box?.id||''}">${modalHeader(box?'Edit box':'A home for your things.','Group your items, then always know what’s inside.')}<div class="modal-body"><div class="form-error" role="alert"></div><div class="form-grid">${field('Box name','name',box?.name||'','text','required maxlength="120" placeholder="e.g. Camera essentials"')}${selectField('Location','location',state.locations.map(l=>[l.id,l.name]),box?.location||state.locations[0].id)}${field('Color','color',box?.color||'#c7bda9','color')}<label class="field full">Notes<textarea name="notes" maxlength="2000" placeholder="Shelf number, contents, or a helpful reminder...">${esc(box?.notes||'')}</textarea></label></div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">${box?'Save changes':'Add box'}</button></div></form>`);
}
function locationForm(location=null,thenBox=false) {
  showModal(`<form id="location-form" data-id="${location?.id||''}" data-then-box="${thenBox}">${modalHeader(location?'Edit location':'Put your space on the map.',thenBox?'First, add a location for your new box.':'A room, a shelf, a studio. Start wherever you are.')}<div class="modal-body"><div class="form-error" role="alert"></div><div class="form-grid">${field('Location name','name',location?.name||'','text','required maxlength="120" placeholder="e.g. Workshop"')}<label class="field full">A little description<textarea name="description" maxlength="240" placeholder="What makes this space yours?">${esc(location?.description||'')}</textarea></label></div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">${location?'Save changes':'Add location'}</button></div></form>`);
}
function itemDetail(id) {
  const i=state.items.find(i=>i.id===Number(id));if(!i)return;
  showModal(`<div class="detail-art">${productArt(i)}<button class="icon-button detail-close" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><div class="modal-body"><div class="detail-heading"><div><div class="eyebrow">${idCode(i.id)} · ${esc(i.kind==='filament'?i.material+' FILAMENT':i.category.toUpperCase())}</div><h2>${esc(i.name)}</h2><p>${esc(locationPath(i))}</p></div><button class="icon-button" data-favorite="${i.id}" aria-label="${i.favorite?'Unfavorite':'Favorite'}">${icon('star')}</button></div>${status(i)}${i.kind==='filament'?`<div class="detail-weight"><div><strong>${i.remaining_weight} g remaining</strong><span>${spoolPercent(i)}% of ${i.total_weight} g</span></div><div class="weight-progress ${i.is_low?'low':''}"><span style="width:${spoolPercent(i)}%"></span></div></div>`:''}<dl class="detail-grid"><div><dt>${i.kind==='filament'?'Brand':'Quantity'}</dt><dd>${esc(i.kind==='filament'?i.brand||'Not set':i.quantity)}</dd></div><div><dt>${i.kind==='filament'?'Spool cost':'Unit value'}</dt><dd>${money(i.value)} AUD</dd></div><div><dt>${i.kind==='filament'?'Diameter':'Low-stock alert'}</dt><dd>${i.kind==='filament'?`${esc(i.diameter)} mm`:`${i.min_quantity} items`}</dd></div><div><dt>${i.kind==='filament'?'Low-stock alert':'Total value'}</dt><dd>${i.kind==='filament'?`${i.low_weight} g`:money(Number(i.value)*i.quantity)+' AUD'}</dd></div></dl>${i.notes?`<div class="detail-notes">${esc(i.notes)}</div>`:''}<div class="detail-actions" style="margin-top:22px">${i.kind==='filament'?`<button class="btn btn-primary" data-usage="${i.id}">${icon('spool')}Log print usage</button>`:''}<button class="btn" data-edit-item="${i.id}">${icon('edit')}Edit details</button><button class="btn" data-label="${i.id}">${icon('print')}Print label</button></div></div><div class="modal-actions"><button class="delete-button" data-delete="items:${i.id}">${icon('trash')}Delete item</button><button class="btn" data-action="close-modal">Done</button></div>`);
}
function boxDetail(id) {
  const b=state.boxes.find(b=>b.id===Number(id));if(!b)return;
  const items=state.items.filter(i=>i.box===b.id);
  showModal(`${modalHeader(b.name,`${idCode(b.id,'box')} · ${state.locations.find(l=>l.id===b.location)?.name}`)}<div class="modal-body">${b.notes?`<p class="info-copy">${esc(b.notes)}</p>`:''}<h3 style="font-size:13px;margin:20px 0 10px">Inside this box · ${items.length} entries</h3>${items.map(i=>`<div class="alert-row" data-item="${i.id}" tabindex="0" role="button"><span class="mini-art">${productArt(i)}</span><div><strong>${esc(i.name)}</strong><small>${i.kind==='filament'?`${i.remaining_weight} g remaining`:i.quantity+' items'}</small></div><span>${icon('chevron-right')}</span></div>`).join('')||'<p class="info-copy">A little room for something new. Add an item and choose this box as its home.</p>'}<div class="detail-actions" style="margin-top:24px"><button class="btn btn-primary" data-box-items="${b.id}">View inventory ${icon('arrow-right')}</button><button class="btn" data-edit-box="${b.id}">${icon('edit')}Edit box</button><button class="btn" data-box-label="${b.id}">${icon('print')}Print label</button></div></div><div class="modal-actions"><button class="delete-button" data-delete="boxes:${b.id}">${icon('trash')}Delete box</button><button class="btn" data-action="close-modal">Done</button></div>`);
}
function locationDetail(id) {
  const l=state.locations.find(l=>l.id===Number(id));if(!l)return;
  const boxes=state.boxes.filter(b=>b.location===l.id);
  showModal(`${modalHeader(l.name,'A place for your things.')}<div class="modal-body"><p class="info-copy">${esc(l.description||'Your own little corner of organized.')}</p><h3 style="font-size:13px;margin:24px 0 15px">${boxes.length} boxes in this space</h3>${boxes.map(b=>`<div class="alert-row" data-box="${b.id}" tabindex="0" role="button"><span class="activity-icon">${icon('box')}</span><strong>${esc(b.name)}</strong><span>${icon('chevron-right')}</span></div>`).join('')}<div class="detail-actions" style="margin-top:24px"><button class="btn btn-primary" data-location-items="${l.id}">View all items ${icon('arrow-right')}</button><button class="btn" data-edit-location="${l.id}">${icon('edit')}Edit location</button></div></div><div class="modal-actions"><button class="delete-button" data-delete="locations:${l.id}">${icon('trash')}Delete location</button><button class="btn" data-action="close-modal">Done</button></div>`);
}
function usageForm(id) {
  const i=state.items.find(i=>i.id===Number(id));
  showModal(`<form id="usage-form" data-id="${i.id}">${modalHeader('A little filament. A new creation.',`${i.name} · ${i.remaining_weight} g available`)}<div class="modal-body"><div class="form-error" role="alert"></div><div class="form-grid">${field('Filament used (g)','grams','','number',`required min="1" max="${i.remaining_weight}" step="1" placeholder="e.g. 45"`)}${field('Print or project','project','','text','maxlength="120" placeholder="e.g. Desk organizer"')}<p class="field-hint" style="grid-column:1/-1">Include supports and purge waste. This amount will be deducted from the spool and recorded in your activity.</p></div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Log usage</button></div></form>`);
}
function labelPreview(id,type='item') {
  const obj=(type==='box'?state.boxes:state.items).find(i=>i.id===Number(id));
  const location=type==='box'?state.locations.find(l=>l.id===obj.location)?.name:locationPath(obj);
  showModal(`${modalHeader('A little label. A lot less searching.','Print, attach, and find it again.')}<div class="modal-body"><div class="label-preview"><div class="label-brand">STOREIT · EVERYTHING IN ITS PLACE</div><h2>${esc(obj.name)}</h2><div class="label-code">${idCode(obj.id,type)}</div><p>${esc(location||'Unassigned')}</p>${type==='box'?`<p>${state.items.filter(i=>i.box===obj.id).length} entries inside</p>`:''}</div><p class="field-hint" style="margin-top:14px">Search the printed code in StoreIt to find this ${type}. Box codes open the box directly from the global search.</p></div><div class="modal-actions"><button class="btn" data-action="close-modal">Done</button><button class="btn btn-primary" data-action="print">${icon('print')}Print label</button></div>`);
}
function deleteConfirm(resource,id) {
  const obj=state[resource].find(i=>i.id===Number(id));
  showModal(`${modalHeader(`Delete ${obj.name}?`,'This will permanently remove this record.')}<div class="modal-body"><div class="form-error" role="alert"></div><p class="info-copy">${resource==='items'?'Its past activity will remain in your history.':'Move all contents to another home before deleting this record.'}</p></div><div class="modal-actions"><button class="btn" data-action="close-modal">Keep it</button><button class="btn btn-danger" data-confirm-delete="${resource}:${id}">Delete permanently</button></div>`);
}
function help(mode='general') {
  const content=mode==='labels'?'<h3>A label today saves a search tomorrow.</h3><p>Open any item or box and choose <strong>Print label</strong>. Each label includes its name, location, and unique code. Type that code into the search bar to find it later.</p>':`<h3>A place for everything.</h3><p>Start with <strong>Locations</strong> for your rooms and shelves. Add <strong>Boxes</strong>, then give each item a home. When you move a box, all its contents follow.</p><h3>Made for makers.</h3><p>Track each filament spool separately. Keep its material, color, diameter, and remaining weight together. After a print, open the spool and choose <strong>Log print usage</strong>. We’ll update the balance for you.</p><h3>The little things that help.</h3><p>Set low-stock alerts, star your favorites, print item labels, and export your full inventory as CSV. Press <strong>⌘ K</strong> or <strong>Ctrl K</strong> to search names, notes, materials, and locations.</p><h3>Your personal workspace.</h3><p>Records are stored in the SQLite database on the computer running StoreIt. This first version is for local use and has no shared accounts or cloud sync. Illustrations represent item types; they are not uploaded product photos.</p>`;
  showModal(`${modalHeader('A little more organized.','Welcome to your personal StoreIt workspace.')}<div class="modal-body info-copy">${content}</div><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Make yourself at home ${icon('arrow-right')}</button></div>`);
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('button,a,[data-item],[data-box],[data-location]');if(!button)return;
  const d=button.dataset;
  try {
    if(d.page){event.preventDefault();navigate(d.page);return;}
    if(d.favorite){event.stopPropagation();const i=state.items.find(i=>i.id===Number(d.favorite));await api(`/api/items/${i.id}/`,'PATCH',{favorite:!i.favorite});await refresh();if(modal.open)itemDetail(i.id);toast(i.favorite?'Removed from favorites':'Kept close in your favorites');return;}
    if(d.item){itemDetail(d.item);return;}if(d.box){boxDetail(d.box);return;}if(d.location){locationDetail(d.location);return;}
    if(d.tab){state.tab=d.tab;render();return;}if(d.view){state.view=d.view;render();return;}
    if(d.newKind){itemForm(null,d.newKind);return;}
    if(d.editItem){itemForm(state.items.find(i=>i.id===Number(d.editItem)));return;}
    if(d.editBox){boxForm(state.boxes.find(i=>i.id===Number(d.editBox)));return;}
    if(d.editLocation){locationForm(state.locations.find(i=>i.id===Number(d.editLocation)));return;}
    if(d.boxItems){modal.close();navigate('inventory',{box:d.boxItems});return;}
    if(d.locationItems){modal.close();navigate('inventory',{location:d.locationItems});return;}
    if(d.usage){usageForm(d.usage);return;}if(d.label){labelPreview(d.label);return;}if(d.boxLabel){labelPreview(d.boxLabel,'box');return;}
    if(d.delete){deleteConfirm(...d.delete.split(':'));return;}
    if(d.confirmDelete){const [resource,id]=d.confirmDelete.split(':');button.disabled=true;try{await api(`/api/${resource}/${id}/`,'DELETE');modal.close();await refresh();toast('Removed from your workspace');}catch(err){button.disabled=false;modalContent.querySelector('.form-error').textContent=err.message;}return;}
    switch(d.action){
      case 'add-item':itemForm();break;case 'add-filament':itemForm(null,'filament');break;case 'add-box':boxForm();break;case 'add-location':locationForm();break;
      case 'close-modal':event.preventDefault();modal.close();break;
      case 'low-stock':navigate('inventory',{low:true});break;
      case 'toggle-low':state.low=!state.low;render();break;
      case 'clear-filters':navigate(state.page);break;
      case 'label-help':help('labels');break;
      case 'print':window.print();break;
      case 'retry':await refresh();break;
    }
  }catch(error){toast(error.message);}
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();if(modal.open)modal.close();document.getElementById('global-search').focus();}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]')){e.preventDefault();e.target.click();}});
document.addEventListener('submit',async event=>{
  if(!event.target.closest('#modal'))return;
  event.preventDefault();const form=event.target,raw=Object.fromEntries(new FormData(form)),id=form.dataset.id,submit=form.querySelector('[type=submit]');
  submit.disabled=true;form.querySelector('.form-error').textContent='';
  try {
    let endpoint,data=raw;
    if(form.id==='item-form') {
      const kind=form.dataset.kind;data={...raw,kind};const storage=data.storage;delete data.storage;data.box=storage.startsWith('box:')?Number(storage.split(':')[1]):null;data.location=storage.startsWith('location:')?Number(storage.split(':')[1]):null;
      for(const key of ['quantity','min_quantity','total_weight','remaining_weight','low_weight'])if(key in data)data[key]=Number(data[key]);
      if(kind==='filament')Object.assign(data,{quantity:1,category:'3D printing',art:'spool'});
      endpoint=`/api/items/${id?id+'/':''}`;
    }else if(form.id==='box-form'){data.location=Number(data.location);endpoint=`/api/boxes/${id?id+'/':''}`;}
    else if(form.id==='location-form')endpoint=`/api/locations/${id?id+'/':''}`;
    else if(form.id==='usage-form'){data.grams=Number(data.grams);endpoint=`/api/items/${id}/usage/`;}
    if(!endpoint)return;
    await api(endpoint,id&&form.id!=='usage-form'?'PATCH':'POST',data);modal.close();await refresh();toast(form.id==='usage-form'?'Print logged. On to the next idea.':id?'Details saved. Everything in its place.':'Added to your little corner of organized.');
    if(form.dataset.thenBox==='true')boxForm();
  }catch(error){form.querySelector('.form-error').textContent=error.message;}
  finally{submit.disabled=false;}
});
main.addEventListener('change',e=>{if(e.target.id==='location-filter')state.location=e.target.value;if(e.target.id==='category-filter')state.category=e.target.value;if(e.target.id==='sort-order')state.sort=e.target.value;render();});
main.addEventListener('input',e=>{if(e.target.id==='local-search'){state.query=e.target.value;document.getElementById('global-search').value=state.query;document.getElementById('collection-results').innerHTML=collection(filteredItems(),true);document.getElementById('results-count').textContent=`${filteredItems().length} entries`;}});
document.getElementById('global-search').addEventListener('input',e=>{navigate('inventory',{query:e.target.value});});
document.getElementById('global-search').addEventListener('keydown',e=>{if(e.key==='Enter'){const code=e.target.value.trim().match(/^BX-0*(\d+)$/i);if(code){const box=state.boxes.find(b=>b.id===Number(code[1]));if(box)boxDetail(box.id);else toast('No box found with that label.');}}});
document.getElementById('alerts-button').addEventListener('click',()=>navigate('inventory',{low:true}));
document.getElementById('tips-button').addEventListener('click',()=>help());
document.getElementById('workspace-button').addEventListener('click',()=>help());
document.getElementById('menu-button').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)||'overview'));
state.page=location.hash.slice(1)||'overview';
refresh().catch(error=>{main.innerHTML=`<div class="empty-state"><h3>Your workspace couldn’t load.</h3><p>${esc(error.message)}</p><button class="btn btn-primary" data-action="retry">Try again</button></div>`;});
