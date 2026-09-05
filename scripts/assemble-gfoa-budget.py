from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, BooleanObject, DictionaryObject, NameObject, NumberObject, TextStringObject
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
OUT = ROOT / "output/pdf/walton-county-fy2027-budget-book-gfoa-ready.pdf"
TMP = Path("/private/tmp")


def reader(name):
    return PdfReader(str(TMP / name))


def add_range(writer, source, start, end):
    """Append inclusive, one-based page range."""
    for number in range(start, end + 1):
        writer.add_page(source.pages[number - 1])


def number_stamp(number):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(612, 792))
    c.setFillColorRGB(1, 1, 1)
    c.rect(34, 15, 176, 20, fill=1, stroke=0)
    c.rect(532, 15, 52, 20, fill=1, stroke=0)
    c.setFillColorRGB(0.39, 0.46, 0.42)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(44, 23, "FY 2027 TENTATIVE BUDGET")
    c.drawRightString(576, 23, str(number))
    c.save()
    buffer.seek(0)
    return PdfReader(buffer).pages[0]


def back_cover():
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(612, 792))
    c.setFillColorRGB(0.0, 0.25, 0.16)
    c.rect(0, 0, 612, 792, fill=1, stroke=0)
    c.setFillColorRGB(0.91, 0.79, 0.37)
    c.rect(48, 603, 38, 3, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Times-Bold", 25)
    c.drawString(48, 548, "Walton County")
    c.drawString(48, 518, "Fiscal Year 2027")
    c.setFillColorRGB(0.91, 0.79, 0.37)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(48, 485, "TENTATIVE BUDGET")
    c.setFillColorRGB(0.89, 0.94, 0.91)
    c.setFont("Helvetica", 9)
    c.drawString(48, 459, "A transparent financial plan for public services,")
    c.drawString(48, 444, "infrastructure, and the future of Walton County.")
    c.setStrokeColorRGB(0.74, 0.77, 0.56)
    c.line(48, 84, 564, 84)
    c.setFillColorRGB(0.91, 0.79, 0.37)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(48, 62, "BOARD OF COUNTY COMMISSIONERS")
    c.drawString(48, 49, "OFFICE OF MANAGEMENT AND BUDGET")
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica", 7)
    c.drawRightString(564, 62, "mywaltonfl.gov")
    c.drawRightString(564, 49, "Accessible web publication available online")
    c.save()
    buffer.seek(0)
    return PdfReader(buffer).pages[0]


def add_baseline_structure(writer):
    """Add document- and section-level tags without disturbing page content."""
    root = DictionaryObject({NameObject("/Type"): NameObject("/StructTreeRoot")})
    root_ref = writer._add_object(root)
    document = DictionaryObject({
        NameObject("/Type"): NameObject("/StructElem"),
        NameObject("/S"): NameObject("/Document"),
        NameObject("/P"): root_ref,
        NameObject("/K"): ArrayObject(),
    })
    document_ref = writer._add_object(document)
    section_refs = ArrayObject()
    for page in writer.pages:
        section = DictionaryObject({
            NameObject("/Type"): NameObject("/StructElem"),
            NameObject("/S"): NameObject("/Sect"),
            NameObject("/P"): document_ref,
            NameObject("/Pg"): page.indirect_reference,
        })
        section_ref = writer._add_object(section)
        section_refs.append(section_ref)

    document[NameObject("/K")] = section_refs
    parent_tree = DictionaryObject({NameObject("/Nums"): ArrayObject()})
    parent_tree_ref = writer._add_object(parent_tree)
    root[NameObject("/K")] = ArrayObject([document_ref])
    root[NameObject("/ParentTree")] = parent_tree_ref
    root[NameObject("/ParentTreeNextKey")] = NumberObject(len(writer.pages))
    writer.root_object[NameObject("/StructTreeRoot")] = root_ref
    writer.root_object[NameObject("/MarkInfo")] = DictionaryObject({NameObject("/Marked"): BooleanObject(True)})


base = PdfReader(str(BASE))
cover = reader("budget-book-cover.pdf")
toc = reader("gfoa-final-toc.pdf")
enh = reader("gfoa-enhancements.pdf")
award = reader("budget-book-gfoa-award.pdf")
transmittal = reader("budget-book-transmittal-letter.pdf")
strategic = reader("budget-book-strategic-initiatives.pdf")
community = reader("budget-book-community-priorities.pdf")
brief = reader("budget-book-budget-in-brief.pdf")
process = reader("budget-book-budget-process.pdf")
consolidated = reader("budget-book-consolidated-ledger.pdf")
change = reader("budget-book-budget-change-summary.pdf")
revenue = reader("budget-book-revenue-ledger.pdf")
property_tax = reader("budget-book-property-tax-allocation.pdf")
expenses = reader("budget-book-summary-of-expenses.pdf")
personnel = reader("budget-book-personnel-ledger.pdf")
funds = reader("budget-book-fund-financial-ledger.pdf")
transfers = reader("budget-book-interfund-transfer-ledger.pdf")
debt = reader("budget-book-debt-ledger.pdf")
long_term = reader("budget-book-long-term-outlook.pdf")
cip = reader("budget-book-cip.pdf")
capital_ledgers = reader("budget-book-capital-fund-ledgers.pdf")
glossary = reader("budget-book-glossary.pdf")
departments = reader("budget-book-departments-and-services.pdf")
constitutional = reader("budget-book-constitutional-officers-ledger.pdf")
independent = reader("budget-book-independent-agencies-ledger.pdf")
overview = reader("budget-book-overview.pdf")
financial_policies = reader("budget-book-financial-policies.pdf")
writer = PdfWriter()

# Opening, corrected contents, and County context. The Overview of Walton
# County now comes from its own dedicated build (adds the historical/public
# information QR panel under Constitutional Officers); base.pages[13] is the
# Organizational Structure page that used to follow it in the flattened book.
writer.add_page(cover.pages[0])
writer.add_page(award.pages[0])
add_range(writer, transmittal, 1, 2)
add_range(writer, toc, 1, 2)
add_range(writer, overview, 1, 3)
writer.add_page(base.pages[13])
writer.add_page(strategic.pages[0])
add_range(writer, community, 1, 3)
writer.add_page(brief.pages[0])

# Budget Change Summary and Property Tax Allocation now sit right behind
# Budget in Brief instead of deep in the Financial Plan section.
add_range(writer, change, 1, 2)
add_range(writer, property_tax, 1, 2)

add_range(writer, process, 1, 2)
add_range(writer, financial_policies, 1, 2)
add_range(writer, base, 22, 23)

# Public-value/GFOA decision guide, including revenue risk, projects, and workshops.
# Revenue Portfolio (enh page 8) moves down to the Financial Plan chapter,
# right before the Revenue Ledger, instead of sitting here after Revenue Strategy.
add_range(writer, enh, 1, 7)
add_range(writer, enh, 9, 16)

# Constitutional Officers, agencies, and departments. The revised overview and
# two Tourism profiles replace the obsolete overview/exclusion language.
writer.add_page(base.pages[23])
add_range(writer, constitutional, 1, 7)
writer.add_page(base.pages[31])
add_range(writer, independent, 1, 4)
writer.add_page(base.pages[38])
writer.add_page(departments.pages[0])
writer.add_page(enh.pages[18])
add_range(writer, departments, 3, 37)

# Financial plan rebuilt from the corrected tentative-budget source pages.
# Budget Change Summary and Property Tax Allocation moved up front (see above).
writer.add_page(base.pages[68])
add_range(writer, consolidated, 1, 2)
writer.add_page(enh.pages[7])
add_range(writer, revenue, 1, 3)
add_range(writer, expenses, 1, 2)
writer.add_page(personnel.pages[0])
add_range(writer, base, 82, 85)
add_range(writer, funds, 1, 2)
writer.add_page(transfers.pages[0])
writer.add_page(debt.pages[0])
add_range(writer, long_term, 1, 2)

# Capital plan, detailed fund schedules, reference section, and back cover.
writer.add_page(base.pages[85])
add_range(writer, cip, 1, 3)
add_range(writer, capital_ledgers, 1, 8)
add_range(writer, glossary, 1, 9)
writer.add_page(back_cover())

EXPECTED_PAGES = 133
if len(writer.pages) != EXPECTED_PAGES:
    raise RuntimeError(f"Expected {EXPECTED_PAGES} pages, assembled {len(writer.pages)}")

# Renumber normal editorial pages. Full-bleed covers/dividers carry no footer.
skip_number = {1, 2, 41, 49, 55, 92, 112, 133}
for number, page in enumerate(writer.pages, start=1):
    if number not in skip_number:
        page.merge_page(number_stamp(number), over=True)

writer.add_metadata({
    "/Title": "Walton County, Florida - Fiscal Year 2027 Tentative Budget",
    "/Author": "Walton County Board of County Commissioners, Office of Management and Budget",
    "/Subject": "Tentative financial plan for public services, infrastructure, and the future of Walton County",
    "/Keywords": "Walton County; FY2027; tentative budget; GFOA; capital improvement plan; public services",
    "/Creator": "Walton County Office of Management and Budget",
})
writer.root_object[NameObject("/Lang")] = TextStringObject("en-US")
writer.root_object[NameObject("/PageMode")] = NameObject("/UseOutlines")
writer.root_object[NameObject("/PageLayout")] = NameObject("/TwoPageRight")
writer.root_object[NameObject("/ViewerPreferences")] = DictionaryObject({NameObject("/DisplayDocTitle"): BooleanObject(True)})

outline = [
    ("Budget Message", 3, None),
    ("Introduction and Our County", 7, None),
    ("Community Priorities and Challenges", 12, "Introduction and Our County"),
    ("Budget in Brief", 15, "Introduction and Our County"),
    ("Budget Change Summary", 16, "Introduction and Our County"),
    ("Property Tax Allocation Ledger", 18, "Introduction and Our County"),
    ("Financial Policies", 22, "Introduction and Our County"),
    ("Public Value and Decision Guide", 26, None),
    ("Program and Service Budget", 28, "Public Value and Decision Guide"),
    ("Program Outcomes", 30, "Public Value and Decision Guide"),
    ("Revenue Strategy", 32, "Public Value and Decision Guide"),
    ("Florida Amendment 3 Risk", 33, "Public Value and Decision Guide"),
    ("Workforce Plan", 34, "Public Value and Decision Guide"),
    ("Long-Term Decisions", 36, "Public Value and Decision Guide"),
    ("Capital Portfolio", 37, "Public Value and Decision Guide"),
    ("Major Project Decision Record", 38, "Public Value and Decision Guide"),
    ("Public Participation", 40, "Public Value and Decision Guide"),
    ("Constitutional Officers", 41, None),
    ("Other Agencies and Court-Related Functions", 49, None),
    ("Departments and Services", 55, None),
    ("Tourism Administration", 84, "Departments and Services"),
    ("Sales and Visitors Center", 85, "Tourism Administration"),
    ("Communications", 86, "Tourism Administration"),
    ("Marketing", 87, "Tourism Administration"),
    ("North Walton", 88, "Tourism Administration"),
    ("Beach Operations", 89, "Departments and Services"),
    ("Beach Renourishment", 90, "Beach Operations"),
    ("Beach Tram", 91, "Beach Operations"),
    ("Financial Plan", 92, None),
    ("Revenue Portfolio", 95, "Financial Plan"),
    ("Revenue Ledger", 96, "Financial Plan"),
    ("Personnel Ledger", 101, "Financial Plan"),
    ("Fund Financial Ledger", 106, "Financial Plan"),
    ("Debt Ledger", 109, "Financial Plan"),
    ("Long-Term Outlook", 110, "Financial Plan"),
    ("Capital Budget", 112, None),
    ("Capital Improvement Plan", 113, "Capital Budget"),
    ("Glossary and Frequently Asked Questions", 124, None),
]
parents = {}
for title, page_number, parent_title in outline:
    parent = parents.get(parent_title)
    item = writer.add_outline_item(title, page_number - 1, parent=parent)
    parents[title] = item

no_border = ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)])
writer.add_uri(32, "https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110", (455, 65, 575, 185), border=no_border)
writer.add_uri(39, "https://walton.civicweb.net/filepro/documents/523125/", (455, 65, 575, 185), border=no_border)
writer.add_uri(132, "https://www.waltoncountyfl.gov", (438, 44, 575, 64), border=no_border)
writer.add_uri(132, "https://budget-waltoncountyfl.com/pages/full-budget-document.html", (393, 27, 575, 44), border=no_border)

add_baseline_structure(writer)
OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("wb") as stream:
    writer.write(stream)

print(f"Wrote {OUT} ({len(writer.pages)} pages)")
