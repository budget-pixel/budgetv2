"""Assemble the reviewed publication and its page-to-HTML source map."""
from pathlib import Path
import json, sys, subprocess, re, html
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject
ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / 'output/pdf/walton-county-fy2027-budget-book.pdf'
SCRATCH = ROOT / 'tmp/pdfs'
source = PdfReader(Path(sys.argv[1]) if len(sys.argv) > 1 else BOOK)
assert len(source.pages) == 135
reviewed = (source.metadata or {}).get('/PublicationReview') == '20261008'
manifest = {}
def put(start, name, count=1, first=1):
    for i in range(count): manifest[start+i] = {'file': name, 'page': first+i}
put(2,'award-revised'); put(3,'transmittal-letter-revised',2); put(5,'page-order-toc',3)
put(9,'county-revised',3); put(12,'organization-revised'); put(13,'strategic-revised')
put(14,'community-priorities-revised',3); put(18,'budget-in-brief-revised')
put(19,'visual-storytelling-revised',2); put(21,'consolidated-ledger-revised',2)
put(23,'change-summary-revised',2); put(25,'gfoa-enhancements-revised',1,8)
put(26,'gfoa-enhancements-revised',1,7); put(27,'revenue-ledger-revised',4)
put(31,'property-tax-revised',2); put(33,'gfoa-enhancements-revised',1,9)
put(34,'expenditure-ledger-revised',3); put(37,'fund-financial-revised',2)
put(39,'interfund-transfer-revised'); put(40,'debt-ledger-revised')
put(41,'visual-storytelling-revised',1,3); put(42,'long-term-outlook-revised',2)
put(45,'budget-process-revised',3); put(48,'gfoa-enhancements-revised',1,12)
put(49,'policies-revised',2); put(52,'constitutional-revised',7)
put(60,'independent-revised',3); put(64,'gfoa-enhancements-revised',1,1)
put(65,'gfoa-enhancements-revised',4,3); put(69,'departments-value-revised')
put(70,'department-operating-revised'); put(71,'departments-value-revised',32,3)
put(104,'gfoa-enhancements-revised',1,10); put(105,'personnel-revised')
put(106,'self-insurance-revised'); put(108,'page-order-capital-guide')
put(109,'cip-revised',3); put(112,'visual-storytelling-revised',2,4)
put(114,'capital-tourism-revised',10); put(125,'glossary-revised',8)
put(133,'statistics-revised',2)
readers = {entry['file']:PdfReader(SCRATCH / (entry['file']+'.pdf')) for entry in manifest.values()}
writer=PdfWriter()
for number in range(1,136):
    if number in manifest:
        entry=manifest[number];page=readers[entry['file']].pages[entry['page']-1]
    else:
        old=123 if number==124 and not reviewed else number
        page=source.pages[old-1]
    writer.add_page(page)
# Back-cover links must match the addresses printed on the page.
for annotation in writer.pages[134].get('/Annots',[]):
    action=annotation.get_object().get('/A')
    if action and action.get('/URI'):
        uri=str(action['/URI'])
        if any(host in uri for host in ('co.walton.fl.us','waltoncountyfl.gov','mywaltonfl.gov')):
            action[NameObject('/URI')]=TextStringObject('https://mywaltonfl.gov/')
        if 'full-budget-document.html' in uri: action[NameObject('/URI')]=TextStringObject('https://final2027.budget-waltoncountyfl.com/pages/full-budget-document.html')
chapters=[(3,'Budget Message'),(8,'Introduction and Our County'),(17,'Financial Overview'),(44,'Budget Process'),(51,'Constitutional Officer Budget'),(59,'Other Agencies and Court-Related Functions Budget'),(63,'Program and Service Budget'),(69,'Board Department Budgets'),(103,'Workforce Budget'),(107,'Capital Budget'),(124,'Glossary, Statistical, and Supplemental Information')]
parents={start:writer.add_outline_item(title,start-1) for start,title in chapters}
# Build sorted, unique destinations so repeated assembly is idempotent.
details=set()
def collect(items):
    for item in items:
        if isinstance(item,list): collect(item);continue
        number=source.get_destination_page_number(item)+1
        if not reviewed and 116<=number<=124: number+=1
        if any(item.title==title for _,title in chapters):continue
        details.add((number,item.title))
collect(source.outline)
for number,title in [(20,'How to Read the Financial Schedules'),(114,'Transportation and Infrastructure Capital Ledger'),(117,'Tourist Development Fund Capital Ledger'),(118,'Sheriff Capital Project Ledger'),(119,'Recreation Plat Fee Fund Capital Ledger'),(120,'Sidewalk Fund Capital Ledger'),(121,'Machinery, Vehicles, and Equipment Ledger')]:details.add((number,title))
profile_html=(SCRATCH/'departments-value-revised.html').read_text()
profile_titles=re.findall(r'<h1\b[^>]*>(.*?)</h1>',profile_html,re.S)[1:]
for number,title in enumerate(profile_titles,71):
    details.add((number,html.unescape(re.sub(r'<[^>]+>',' ',title)).strip()))
for number,title in sorted(details):
    parent=max(start for start,_ in chapters if start<=number)
    writer.add_outline_item(title,number-1,parent=parents[parent])
metadata={key:str(value) for key,value in (source.metadata or {}).items() if value is not None}
metadata.update({'/PublicationReview':'20261008','/Title':'Walton County FY 2027 Final Budget','/DepartmentProfileOrder':'grouped-v1'})
writer.add_metadata(metadata);writer.compress_identical_objects(remove_duplicates=True,remove_unreferenced=True)
temporary=BOOK.with_suffix('.reviewed.pdf')
with temporary.open('wb') as f:writer.write(f)
assert len(PdfReader(temporary).pages)==135
temporary.replace(BOOK)
subprocess.run([sys.executable,str(ROOT/'scripts/finalize-budget-book-order.py'),'--renumber-only'],check=True)
(SCRATCH/'publication-pages.json').write_text(json.dumps(manifest,indent=2))
# Text fallback is needed only for the original photo covers and back cover.
finished=PdfReader(BOOK); fallback={}
for i,page in enumerate(finished.pages,1):
    if i not in manifest:
        fallback[i]={'text':page.extract_text() or '', 'links':[str(a.get_object().get('/A',{}).get('/URI')) for a in page.get('/Annots',[]) if a.get_object().get('/A',{}).get('/URI')]}
(SCRATCH/'publication-covers.json').write_text(json.dumps(fallback,indent=2))
print(f'Assembled 135 pages; {len(manifest)} pages have shared HTML sources.')
