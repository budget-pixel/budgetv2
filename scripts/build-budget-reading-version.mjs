import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),scratch=path.join(root,'tmp/pdfs');
const manifest=JSON.parse(readFileSync(path.join(scratch,'publication-pages.json'),'utf8'));
const covers=JSON.parse(readFileSync(path.join(scratch,'publication-covers.json'),'utf8'));
const photos=new Map();
function inventory(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())inventory(f);else if(/\.(png|jpe?g|webp|svg)$/i.test(f))photos.set(createHash('sha256').update(readFileSync(f)).digest('hex'),'../'+path.relative(root,f));}}
inventory(path.join(root,'assets/images'));
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const cleaned=new Map();
for(const file of new Set(Object.values(manifest).map(e=>e.file))){
 await page.setContent(readFileSync(path.join(scratch,file+'.html'),'utf8'));
 const sections=await page.evaluate(()=>{
  const top=[...document.body.children].filter(e=>e.tagName==='SECTION'||e.classList.contains('page'));
  return top.map(section=>{
   const copy=section.cloneNode(true);
   copy.querySelectorAll('script,style,header,footer,.pnum,.divider-frame,.composition-track,.bar-track,.arrow').forEach(e=>e.remove());
   copy.querySelectorAll('[style]').forEach(e=>{if(e.style.display==='none')e.remove()});
   copy.querySelectorAll('h1b').forEach(e=>{const h=document.createElement('h2');h.innerHTML=e.innerHTML;e.replaceWith(h)});
   const title=copy.querySelector('h1,h2')?.textContent.trim()||'Budget information';
   copy.querySelectorAll('h1').forEach(e=>{const h=document.createElement('h2');h.innerHTML=e.innerHTML;e.replaceWith(h)});
   // Printed display headings become a logical hierarchy in the reading edition.
   const first=copy.querySelector('h2');copy.querySelectorAll('h2').forEach(e=>{if(e!==first){const h=document.createElement('h3');h.innerHTML=e.innerHTML;e.replaceWith(h)}});
   copy.querySelectorAll('img').forEach(e=>{if(!e.hasAttribute('alt'))e.alt='';if(e.closest('.qr-wrap,.page-qr')){const a=e.closest('a');if(a){const text=a.querySelector('span')?.textContent||a.getAttribute('aria-label')||'View online';a.textContent=text;}else e.remove();}if(e.classList.contains('divider-photo'))e.remove()});
   if(title==='Organizational Structure'){
    const note=document.createElement('div');note.innerHTML='<h3>Organization chart in words</h3><p>Citizens elect the Board of County Commissioners and the Tax Collector, Clerk of the Circuit Court, Property Appraiser, Supervisor of Elections, and Sheriff. The constitutional offices are independently elected.</p><ul><li>The Chief Financial Officer oversees the Office of Management and Budget, Purchasing, and Grants.</li><li>The County Attorney oversees public records, contracts, and litigation.</li><li>The County Administrator oversees the Deputy County Administrator, Director of Human Resources, and Director of Governmental Coordination.</li><li>The Deputy County Administrator oversees Public Works, Engineering, Building, Code Compliance, Administration, Parks and Recreation, Emergency Management, Building Construction and Maintenance, Tourism Administration, Environmental Services, Planning, and Beach Operations.</li><li>Environmental Services includes Solid Waste, Mosquito Control, Environmental Resources, and Soil Conservation. Administration includes Public Information, Technology Services, Extension, Libraries, HUD, GIS, Probation, and Veteran Services.</li></ul>';copy.querySelector('.chart-card')?.append(note);
   }
   copy.querySelectorAll('svg').forEach(e=>{if(!e.textContent.trim())e.remove();else{e.setAttribute('role','img');e.setAttribute('aria-label',e.querySelector('title')?.textContent||title)}});
   // Convert visually aligned financial rows into real table cells.
   copy.querySelectorAll('.dept-table,.ledger,.table,.index-list').forEach(container=>{
    const rows=[...container.children].filter(e=>e.matches('.dept-row,.lrow,.tr,.index-row'));
    if(!rows.length)return;
    const table=document.createElement('table');const caption=document.createElement('caption');caption.textContent=container.previousElementSibling?.textContent?.trim()||title;table.append(caption);
    const head=document.createElement('thead'),body=document.createElement('tbody');
    rows.forEach((row,i)=>{const tr=document.createElement('tr');const header=row.classList.contains('head');[...row.children].forEach((cell,j)=>{const el=document.createElement(header||j===0?'th':'td');if(el.tagName==='TH')el.scope=header?'col':'row';el.innerHTML=cell.innerHTML;tr.append(el)});(header?head:body).append(tr)});
    if(head.children.length)table.append(head);table.append(body);container.replaceWith(table);
   });
   copy.querySelectorAll('.pm-item').forEach(item=>{
    const trend=item.querySelector('.pm-trend');if(!trend)return;
    const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=item.querySelector('.pm-q')?.textContent||'Performance measure';table.append(caption);
    const head=document.createElement('tr'),values=document.createElement('tr');[...trend.children].forEach(span=>{const value=span.querySelector('b');const label=span.cloneNode(true);label.querySelector('b')?.remove();const th=document.createElement('th');th.scope='col';th.textContent=label.textContent.trim();head.append(th);const td=document.createElement('td');td.innerHTML=value?.innerHTML||span.innerHTML;values.append(td)});const thead=document.createElement('thead'),tbody=document.createElement('tbody');thead.append(head);tbody.append(values);table.append(thead,tbody);item.querySelector('.pm-q')?.remove();trend.replaceWith(table);
   });
   copy.querySelectorAll('.con-list').forEach(list=>{const ul=document.createElement('ul');[...list.children].forEach(row=>{const li=document.createElement('li');li.innerHTML=row.innerHTML;ul.append(li)});list.replaceWith(ul)});
   // The print dictionary uses dt/dd inside columns; restore semantic lists.
   for(const parent of new Set([...copy.querySelectorAll('dt,dd')].map(e=>e.parentElement))){
    if(parent.tagName!=='DL'){const dl=document.createElement('dl');for(const e of [...parent.children])if(e.matches('dt,dd'))dl.append(e);parent.append(dl)}
   }
   copy.querySelectorAll('table th').forEach(th=>{if(!th.hasAttribute('scope'))th.scope=th.closest('thead')?'col':'row'});
   copy.querySelectorAll('[style],[id],[onclick],[aria-label]').forEach(e=>{e.removeAttribute('style');e.removeAttribute('id');e.removeAttribute('onclick');if(e.tagName!=='SVG'&&e.tagName!=='A')e.removeAttribute('aria-label')});
   copy.querySelectorAll('a[href]').forEach(a=>{if(a.getAttribute('href').startsWith('http://127.0.0.1'))a.href=a.getAttribute('href').replace(/http:\/\/127\.0\.0\.1:\d+/,'https://final2027.budget-waltoncountyfl.com')});
   return {title,html:copy.innerHTML};
  });
 });
 for(const section of sections)section.html=section.html.replace(/src="data:image\/[^;]+;base64,([^"]+)"/g,(all,b64)=>{const hash=createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex');return photos.has(hash)?`src="${photos.get(hash)}"`:all});
 cleaned.set(file,sections);
}
await browser.close();
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const entries=[];
for(let n=1;n<=135;n++){
 const source=manifest[n];let title,html;
 if(source){const section=cleaned.get(source.file)[source.page-1];if(!section)throw Error(`Missing HTML page ${n}`);({title,html}=section)}
 else {const c=covers[n];const titles={1:'Walton County FY 2027 Final Budget',8:'Our County',17:'Financial Overview',44:'Budget Process',51:'Constitutional Officer Budget',59:'Other Agencies and Courts',63:'Program and Service Budget',103:'Workforce Budget',107:'Capital Budget',124:'Reference Information',135:'Budget publication and contacts'};title=titles[n]||'Budget information';const text=n===1?'Walton County, Florida. Fiscal Year 2027 Final Budget. October 1, 2026 – September 30, 2027.':c.text.replace(/BUDGET BOOK\s*/,'').trim();html=`<h2>${escape(title)}</h2><p class="cover-copy">${escape(text)}</p>${c.links.map(url=>`<p><a href="${escape(url)}">${escape(url.includes('full-budget-document')?'Read the complete budget online':url)}</a></p>`).join('')}`;}
 entries.push({n,title,html:`<section id="page-${n}" class="reading-page" aria-labelledby="title-${n}"><p class="page-reference">Print page ${n} · <a href="../output/pdf/walton-county-fy2027-budget-book.pdf#page=${n}">View PDF page</a></p><div id="title-${n}" class="section-label">${escape(title)}</div>${html}<p class="back-top"><a href="#contents">Back to contents</a></p></section>`});
}
const chapters=[1,3,8,17,44,51,59,63,69,103,107,124];
const css=`:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f7f5;color:#173229;font:18px/1.6 system-ui,sans-serif}a{color:#005d3c;text-decoration:underline;text-underline-offset:3px}a:focus-visible{outline:3px solid #005d3c;outline-offset:4px}.skip{position:absolute;left:-9999px}.skip:focus{left:16px;top:16px;background:white;padding:12px;z-index:2}.site-header,main{max-width:1100px;margin:auto;padding:32px 24px}h1,h2,h3{color:#003f28;line-height:1.25}h1{font:700 2.3rem/1.15 Georgia,serif}h2{font:700 1.8rem/1.2 Georgia,serif}h3{font-size:1.2rem;margin-top:1.5em}.reading-page{background:white;padding:28px;margin:24px 0;border:1px solid #c8d6cd;border-radius:12px;scroll-margin:16px}.page-reference,.back-top{font-size:.9rem}.section-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.mix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mix span{padding:8px;border:1px solid #c8d6cd}.mix b{display:block}.values{display:flex;flex-wrap:wrap;gap:12px}.cover-copy{white-space:pre-line}.kicker,.kicker2{display:block;font-size:.9rem;font-weight:700;margin-top:1rem}.top-grid,.editorial-cards,.rev-con-grid,.grid2,.grid3,.stat-strip,.stats,.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}.side-col,.side-card,.goal-quote,.stat-card,.stat,.card,.band{background:#eef4f0;border:1px solid #c8d6cd;border-radius:8px;padding:16px;margin:12px 0}.side-card b,.stat-card b,.stat b,.primary b{display:block;font-size:1.2rem}.side-card span,.stat span,.stat-card span{display:block}img,svg{max-width:100%;height:auto}figure{max-width:100%;margin:12px 0}.reading-page *{min-width:0}body{overflow-wrap:anywhere}.annual-department-photo{max-width:320px;margin:12px 0}.official-line img,.comm-card img{max-width:150px}.pm-item,.svc-block{margin:20px 0}.payer-row,.con-row,.cap-row,.fte-row,.composition-row,.row,.tr{padding:10px 0;border-bottom:1px solid #d7e2dc;overflow-wrap:anywhere}.payer-amt,.cap-row b,.con-row b,.composition-label b{margin-left:12px}.payer-detail{margin:4px 0}.side-stats div,.workforce-line{margin:8px 0}.composition-label{display:flex;justify-content:space-between;gap:20px}.composition-track{display:none}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:1rem}caption{text-align:left;font-weight:700;color:#003f28;padding:8px 0}th,td{border:1px solid #b9cbbf;padding:10px;text-align:left;vertical-align:top}thead{background:#e6eee8}tbody tr:nth-child(even){background:#f6f9f7}.project-name,.project-funding,.project-benefit{display:block;margin-bottom:5px}.table-scroll{overflow-x:auto;max-width:100%;padding-bottom:4px}nav ul{columns:2;column-gap:32px;padding-left:24px}nav li{break-inside:avoid;margin-bottom:8px}.table-scroll:focus-visible{outline:3px solid #005d3c}.glossary-cols,.columns{display:block}.term,.glossary-entry{margin:16px 0}footer{padding:24px;text-align:center}@media(max-width:650px){body{font-size:17px}.site-header,main{padding:18px 12px}.reading-page{padding:18px 14px}nav ul{columns:1}h1{font-size:1.9rem}h2{font-size:1.55rem}.table-scroll table{min-width:600px}.top-grid{display:block}}@media print{body{background:white;font-size:11pt}.site-header,main{max-width:none}.reading-page{break-before:page;border:0}.page-reference,.back-top,.skip{display:none}}`;
let result=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FY 2027 Final Budget — Reading Edition | Walton County</title><meta name="description" content="Complete Walton County FY 2027 final budget in a responsive reading edition with financial tables, department profiles, capital projects, and glossary."><style>${css}</style></head><body><a class="skip" href="#budget-content">Skip to budget content</a><header class="site-header"><p>Walton County, Florida</p><h1>FY 2027 Final Budget</h1><p>Reading edition · October 1, 2026–September 30, 2027</p><p><a href="budget-book.html">Open the budget book viewer</a> · <a href="../output/pdf/walton-county-fy2027-budget-book.pdf" download>Download the print book</a></p><nav id="contents" aria-label="Budget book contents"><h2>Contents</h2><ul>${chapters.map(n=>`<li><a href="#page-${n}">${escape(entries[n-1].title)}</a></li>`).join('')}</ul><details><summary>All pages and department profiles</summary><ul>${entries.map(e=>`<li><a href="#page-${e.n}">${e.n}. ${escape(e.title)}</a></li>`).join('')}</ul></details></nav></header><main id="budget-content">${entries.map(e=>e.html).join('\n')}</main><footer>Walton County FY 2027 Final Budget</footer></body></html>`;
// All wide tables have a keyboard-focusable scroll region on narrow screens.
await (async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();await p.setContent(result);await p.evaluate(()=>{document.querySelectorAll('table').forEach((t,i)=>{const div=document.createElement('div');div.className='table-scroll';div.tabIndex=0;div.setAttribute('role','region');div.setAttribute('aria-label',t.querySelector('caption')?.textContent||`Budget table ${i+1}`);t.before(div);div.append(t)});document.querySelectorAll('small').forEach(e=>{e.style.fontSize='inherit'});});result=await p.content();await b.close()})();
writeFileSync(path.join(root,'pages/full-budget-document.html'),result);
console.log('Wrote reading edition: 135 page sections.');
