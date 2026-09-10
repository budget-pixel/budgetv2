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
    # Each chapter's own footer (text + its divider line) sits at a
    # slightly different y-offset depending on that script's own CSS
    # (observed 33-36pt from the bottom across chapters). Covering only a
    # band tight around the text left stray slivers of the original
    # line/text poking out on some chapters. Instead, blank the whole
    # footer band (line included) full-width, then redraw a single
    # consistent line and label so every page matches regardless of the
    # source chapter's own footer positioning.
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(612, 792))
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, 612, 40, fill=1, stroke=0)
    c.setStrokeColorRGB(0.7961, 0.8471, 0.8196)
    c.setLineWidth(0.75)
    c.line(45, 36, 567, 36)
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
org_structure = reader("budget-book-org-structure.pdf")
divider_constitutional = reader("divider-constitutional-officers.pdf")
divider_other_agencies = reader("divider-other-agencies.pdf")
divider_financial_plan = reader("divider-financial-plan.pdf")
divider_capital_budget = reader("divider-capital-budget.pdf")
divider_our_county = reader("divider-our-county.pdf")
divider_financial_overview = reader("divider-financial-overview.pdf")
divider_budget_process = reader("divider-budget-process.pdf")
divider_workforce_plan = reader("divider-workforce-plan.pdf")
divider_glossary = reader("divider-glossary.pdf")
writer = PdfWriter()

# Opening, corrected contents, and County context. The Overview of Walton
# County now comes from its own dedicated build (adds the historical/public
# information QR panel under Constitutional Officers). Organizational
# Structure also comes from its own dedicated build (build-organizational-
# structure.mjs) rather than base.pages[13] -- the flattened book's copy of
# that page carries a stray shadow artifact behind the chart that the
# dedicated build fixes.
writer.add_page(cover.pages[0])
writer.add_page(award.pages[0])
add_range(writer, transmittal, 1, 2)
add_range(writer, toc, 1, 3)

# Our County, like every other chapter, now opens on its own divider page.
writer.add_page(divider_our_county.pages[0])
add_range(writer, overview, 1, 3)
writer.add_page(org_structure.pages[0])
writer.add_page(strategic.pages[0])
add_range(writer, community, 1, 1)

# Financial Overview divider, then Budget in Brief through Florida
# Amendment 3 Risk (Budget Change Summary and Property Tax Allocation sit
# right behind Budget in Brief instead of deep in the Financial Plan
# section; Florida Amendment 3 Risk, enh page 9, moves up here too instead
# of sitting deep in the Public Value chapter). The countywide ledgers --
# Consolidated Budget, Revenue Portfolio, Revenue, Expenditure, Fund
# Financial, Interfund Transfer, and Debt -- now sit here too, right behind
# Florida Amendment 3 Risk, instead of down in the Financial Plan chapter;
# only Contractual Services Ledger and Long-Term Outlook remain there.
writer.add_page(divider_financial_overview.pages[0])
writer.add_page(brief.pages[0])
add_range(writer, consolidated, 1, 2)
add_range(writer, change, 1, 2)
writer.add_page(enh.pages[7])
add_range(writer, revenue, 1, 4)
add_range(writer, property_tax, 1, 2)
writer.add_page(enh.pages[8])
add_range(writer, expenses, 1, 3)
add_range(writer, funds, 1, 2)
writer.add_page(transfers.pages[0])
writer.add_page(debt.pages[0])

writer.add_page(divider_budget_process.pages[0])
add_range(writer, process, 1, 2)
writer.add_page(enh.pages[11])
add_range(writer, financial_policies, 1, 2)

# Public-value/GFOA decision guide, including revenue risk, projects, and workshops.
# Revenue Portfolio (enh page 8) moves down to the Financial Plan chapter,
# right before the Revenue Ledger, instead of sitting here after Revenue Strategy.
# Florida Amendment 3 Risk (enh page 9) moved up to the Financial Overview
# group above, so this second range starts at enh page 10 instead of 9.
add_range(writer, enh, 1, 7)

# Personnel Ledger now sits right behind the Workforce Plan page (enh page
# 10), inside the Workforce Plan group, instead of deep in the Financial
# Plan chapter -- so enh page 10 is pulled out on its own, then Personnel
# Ledger, then the rest of the Workforce/Public Value range. The old enh
# page 11 ("Where Personnel Investment Changes") was deleted -- its stat
# cards were merged into enh page 10 -- so this range now starts at enh
# page 11 (Long-Term Decisions, formerly enh page 12) instead of 12, and
# runs one page shorter (11-15 instead of 12-16). Workforce Plan now opens
# on its own divider page too.
writer.add_page(divider_workforce_plan.pages[0])
writer.add_page(enh.pages[9])
writer.add_page(personnel.pages[0])
writer.add_page(enh.pages[10])

# Constitutional Officers, agencies, and departments. The revised overview and
# two Tourism profiles replace the obsolete overview/exclusion language.
# The Departments and Services chapter divider is followed directly by the
# Department Operating Ledger (base.pages[38]) as the chapter's first content
# page; the old stats/office-list overview (enh.pages[18]) was dropped as
# redundant with it. Chapter dividers now come from the freshly-rendered
# divider_* PDFs (kicker text "Budget Book", not the old base.pages copies
# that still said "Budget Book Guide").
writer.add_page(divider_constitutional.pages[0])
add_range(writer, constitutional, 1, 7)
writer.add_page(divider_other_agencies.pages[0])
add_range(writer, independent, 1, 3)
writer.add_page(departments.pages[0])
writer.add_page(base.pages[38])
add_range(writer, departments, 3, 34)

# Financial plan, now trimmed down to Contractual Services Ledger and
# Long-Term Outlook -- Consolidated Budget, Revenue Portfolio, Revenue,
# Expenditure, Fund Financial, Interfund Transfer, and Debt all moved up
# into the Financial Overview subsection (see above). Budget Change Summary
# and Property Tax Allocation moved up front earlier too; Personnel Ledger
# moved into the Workforce Plan group (see above).
writer.add_page(divider_financial_plan.pages[0])
add_range(writer, base, 82, 85)
add_range(writer, long_term, 1, 2)

# Capital plan, detailed fund schedules, reference section, and back cover.
# Capital Portfolio, Major Project Decision Record, and Capital
# Accountability were removed as duplicative of the Capital Improvement
# Plan and the now fully itemized Machinery, Vehicles, and Equipment
# Ledger. Long-Term Decisions (enh page 11) stays behind in Workforce
# Budget.
writer.add_page(divider_capital_budget.pages[0])
add_range(writer, cip, 1, 3)
add_range(writer, capital_ledgers, 1, 10)

# Glossary, Statistical, and Supplemental Information is the book's
# closing chapter, with its own divider. The Glossary itself leads the
# chapter now, with Statistical and Supplemental Information and
# Principal Property Taxpayers following behind it.
writer.add_page(divider_glossary.pages[0])
add_range(writer, glossary, 1, 9)
add_range(writer, base, 22, 23)

writer.add_page(back_cover())

EXPECTED_PAGES = 132
if len(writer.pages) != EXPECTED_PAGES:
    raise RuntimeError(f"Expected {EXPECTED_PAGES} pages, assembled {len(writer.pages)}")

# Renumber normal editorial pages. Full-bleed covers/dividers carry no footer.
skip_number = {1, 2, 8, 15, 36, 49, 53, 61, 65, 99, 106, 120, 132}
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
    ("Introduction and Our County", 8, None),
    ("Community Priorities and Challenges", 14, "Introduction and Our County"),
    ("Financial Overview", 15, None),
    ("Budget in Brief", 16, "Financial Overview"),
    ("Consolidated Budget Ledger", 17, "Financial Overview"),
    ("Budget Change Summary", 19, "Financial Overview"),
    ("Revenue Portfolio", 21, "Financial Overview"),
    ("Revenue Ledger", 22, "Financial Overview"),
    ("Property Tax Allocation Ledger", 26, "Financial Overview"),
    ("Florida Amendment 3 Risk", 28, "Financial Overview"),
    ("Expenditure Ledger", 29, "Financial Overview"),
    ("Fund Financial Ledger", 32, "Financial Overview"),
    ("Interfund Transfer Ledger", 34, "Financial Overview"),
    ("Debt Ledger", 35, "Financial Overview"),
    ("Budget Process", 36, None),
    ("Public Participation", 39, "Budget Process"),
    ("Financial Policies", 40, "Budget Process"),
    ("Public Value and Decision Guide", 42, "Budget Process"),
    ("Program and Service Budget", 44, "Public Value and Decision Guide"),
    ("Program Outcomes", 46, "Public Value and Decision Guide"),
    ("Revenue Strategy", 48, "Public Value and Decision Guide"),
    ("Workforce Budget", 49, None),
    ("Personnel Ledger", 51, "Workforce Budget"),
    ("Long-Term Decisions", 52, "Workforce Budget"),
    ("Constitutional Officers", 53, None),
    ("Other Agencies and Court-Related Functions", 61, None),
    ("Departments and Services", 65, None),
    ("Tourism Administration", 93, "Departments and Services"),
    ("Sales and Visitors Center", 94, "Tourism Administration"),
    ("Communications", 95, "Tourism Administration"),
    ("Marketing", 96, "Tourism Administration"),
    ("Beach Operations", 97, "Departments and Services"),
    ("Beach Tram", 98, "Beach Operations"),
    ("Financial Plan", 99, None),
    ("Contractual Services Ledger", 100, "Financial Plan"),
    ("Long-Term Outlook", 104, "Financial Plan"),
    ("Capital Budget", 106, None),
    ("Capital Improvement Plan", 107, "Capital Budget"),
    ("Glossary, Statistical, and Supplemental Information", 120, None),
    ("Glossary and Frequently Asked Questions", 121, "Glossary, Statistical, and Supplemental Information"),
    ("Statistical and Supplemental Information", 130, "Glossary, Statistical, and Supplemental Information"),
    ("Principal Property Taxpayers", 131, "Glossary, Statistical, and Supplemental Information"),
]
parents = {}
for title, page_number, parent_title in outline:
    parent = parents.get(parent_title)
    item = writer.add_outline_item(title, page_number - 1, parent=parent)
    parents[title] = item

no_border = ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)])
writer.add_uri(27, "https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110", (455, 65, 575, 185), border=no_border)
writer.add_uri(38, "https://walton.civicweb.net/filepro/documents/523125/", (455, 65, 575, 185), border=no_border)
writer.add_uri(131, "https://www.waltoncountyfl.gov", (438, 44, 575, 64), border=no_border)
writer.add_uri(131, "https://budget-waltoncountyfl.com/pages/full-budget-document.html", (393, 27, 575, 44), border=no_border)

# Every QR code in the book gets a matching clickable link over the same
# spot, so a reader viewing the PDF on-screen can click straight through
# instead of having to scan with a phone. Rects below are the QR images'
# own bounding boxes (0-indexed page, PyMuPDF top-left-origin coordinates
# as reported by page.get_image_rects()) -- converted to PDF's
# bottom-left-origin space by _uri. If a chapter's layout changes enough
# to move a QR code, re-run the PyMuPDF scan and refresh the matching
# rect(s) below rather than guessing.
PAGE_H = 792  # 11in x 72pt/in


def _uri(page_index, url, rect, pad=3):
    x0, y0, x1, y1 = rect
    writer.add_uri(
        page_index,
        url,
        (x0 - pad, PAGE_H - y1 - pad, x1 + pad, PAGE_H - y0 + pad),
        border=no_border,
    )


# Discover Walton County: "See Walton County in motion" video QR
_uri(9, "https://www.youtube.com/watch?v=SIDgNn9c1q0", (63.8, 351.8, 132.8, 420.0))

# Board of County Commissioners: five "Walton County history and public
# information" QR codes, left to right
_uri(10, "https://www.youtube.com/watch?v=fnHIXvjeif4&list=PL9UIKCDmOMoE_F9wjRwMdUXqn-8RNcdmr", (84.0, 559.5, 128.2, 603.8))
_uri(10, "https://www.mywaltonfl.gov/DocumentCenter/View/41693/Who_was_George_Walton_Jr", (183.8, 559.5, 228.8, 603.8))
_uri(10, "https://www.mywaltonfl.gov/314/History", (283.5, 559.5, 328.5, 603.8))
_uri(10, "https://waltoncountyheritage.org/", (383.2, 559.5, 428.2, 603.8))
_uri(10, "https://walton200.com/", (483.8, 559.5, 528.0, 603.8))

# Property Tax Allocation: property-tax calculator QR
_uri(26, "https://budget-waltoncountyfl.com/pages/summary-of-property-tax-allocations.html?embed=calculator", (477.0, 288.0, 534.0, 345.8))

# Summary of Financial Policies: nine policy QR codes, reading top-to-bottom
# then left-to-right (matches the two-column layout)
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/9811/Fund-Balance-Policy-Resolution", (234.0, 181.5, 281.2, 229.5))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/9817/Budget-Policy-Per-Florida-Statutes-Chapters-129-and-200", (506.2, 181.5, 553.5, 229.5))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/9813/Cash-Handling-Policy", (234.0, 297.0, 281.2, 344.2))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/40346/Grants-Administration-Handbook", (506.2, 297.0, 553.5, 344.2))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/9812", (234.0, 405.8, 281.2, 453.0))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/40294/Capital-Asset-Policy", (506.2, 405.8, 553.5, 453.0))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/11655", (234.0, 514.5, 281.2, 561.8))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/9816", (506.2, 514.5, 553.5, 561.8))
_uri(40, "https://www.co.walton.fl.us/DocumentCenter/View/40347/Indirect-Administrative-Cost-Allocation-Policy", (234.0, 623.2, 281.2, 670.5))

# Personnel Ledger QR
_uri(50, "https://budget-waltoncountyfl.com/pages/personnel-ledger.html", (502.5, 82.5, 549.8, 130.5))

# Constitutional Officers: each officer's own budget-certification QR
_uri(54, "https://www.mywaltonfl.gov/DocumentCenter/View/45225/Sheriff-Budget-Certification", (475.5, 233.2, 522.8, 280.5))
_uri(56, "https://www.mywaltonfl.gov/DocumentCenter/View/45479/FY27-Budget-DOR-Submission", (475.5, 233.2, 522.8, 280.5))
_uri(57, "https://www.mywaltonfl.gov/DocumentCenter/View/45227/Clerk-of-Court-and-Comptroller-Budget", (475.5, 214.5, 522.8, 261.8))
_uri(58, "https://www.mywaltonfl.gov/DocumentCenter/View/45269/Property-Appraiser-Submission", (475.5, 221.2, 522.8, 268.5))
_uri(59, "https://www.mywaltonfl.gov/DocumentCenter/View/45234/Supervisor-of-Elections-Budget", (475.5, 214.5, 522.8, 261.8))

# Departments and Services: each department's own "View Online" QR,
# page index -> (url, rect)
DEPARTMENT_QR = {
    66: ("https://budget-waltoncountyfl.com/pages/building-construction-and-maintenance.html", (474.0, 219.75, 527.25, 272.25)),
    67: ("https://budget-waltoncountyfl.com/pages/building-department.html", (474.0, 228.75, 527.25, 282.0)),
    68: ("https://budget-waltoncountyfl.com/pages/code-compliance.html", (474.0, 198.75, 527.25, 252.0)),
    69: ("https://budget-waltoncountyfl.com/pages/county-administration.html", (474.0, 219.75, 527.25, 272.25)),
    70: ("https://budget-waltoncountyfl.com/pages/eagle-springs-golf-and-recreation-center.html", (474.0, 219.75, 527.25, 272.25)),
    71: ("https://budget-waltoncountyfl.com/pages/eagle-springs-grill.html", (474.0, 219.75, 527.25, 272.25)),
    72: ("https://budget-waltoncountyfl.com/pages/emergency-management.html", (474.0, 216.75, 527.25, 270.0)),
    73: ("https://budget-waltoncountyfl.com/pages/engineering-department.html", (474.0, 198.75, 527.25, 252.0)),
    74: ("https://budget-waltoncountyfl.com/pages/environmental-resources.html", (474.0, 219.75, 527.25, 272.25)),
    75: ("https://budget-waltoncountyfl.com/pages/extension-office.html", (474.0, 219.75, 527.25, 272.25)),
    76: ("https://budget-waltoncountyfl.com/pages/geographic-info-systems.html", (474.0, 198.75, 527.25, 252.0)),
    77: ("https://budget-waltoncountyfl.com/pages/housing-and-urban-development.html", (474.0, 226.5, 527.25, 279.0)),
    78: ("https://budget-waltoncountyfl.com/pages/human-resources.html", (474.0, 198.75, 527.25, 252.0)),
    79: ("https://budget-waltoncountyfl.com/pages/libraries.html", (474.0, 198.75, 527.25, 252.0)),
    80: ("https://budget-waltoncountyfl.com/pages/mosquito-control.html", (474.0, 228.75, 527.25, 282.0)),
    81: ("https://budget-waltoncountyfl.com/pages/mossy-head-wastewater-treatment-facility.html", (474.0, 219.75, 527.25, 272.25)),
    82: ("https://budget-waltoncountyfl.com/pages/office-of-management-and-budget.html", (474.0, 227.25, 527.25, 280.5)),
    83: ("https://budget-waltoncountyfl.com/pages/office-of-the-county-attorney.html", (474.0, 216.75, 527.25, 270.0)),
    84: ("https://budget-waltoncountyfl.com/pages/planning.html", (474.0, 224.25, 527.25, 277.5)),
    85: ("https://budget-waltoncountyfl.com/pages/probation.html", (474.0, 198.75, 527.25, 252.0)),
    86: ("https://budget-waltoncountyfl.com/pages/public-works.html", (474.0, 219.75, 527.25, 272.25)),
    87: ("https://budget-waltoncountyfl.com/pages/purchasing.html", (474.0, 227.25, 527.25, 280.5)),
    88: ("https://budget-waltoncountyfl.com/pages/recreation.html", (474.0, 219.75, 527.25, 272.25)),
    89: ("https://budget-waltoncountyfl.com/pages/soil-conservation.html", (474.0, 198.75, 527.25, 252.0)),
    90: ("https://budget-waltoncountyfl.com/pages/solid-waste.html", (474.0, 228.75, 527.25, 282.0)),
    91: ("https://budget-waltoncountyfl.com/pages/veteran-services.html", (474.0, 198.75, 527.25, 252.0)),
    92: ("https://budget-waltoncountyfl.com/pages/tourism-administration.html", (474.0, 228.75, 527.25, 282.0)),
    93: ("https://budget-waltoncountyfl.com/pages/tourism-administration.html#sales-and-visitor-center", (474.0, 228.75, 527.25, 282.0)),
    94: ("https://budget-waltoncountyfl.com/pages/tourism-administration.html#communications", (474.0, 228.75, 527.25, 282.0)),
    95: ("https://budget-waltoncountyfl.com/pages/tourism-administration.html#marketing", (474.0, 228.75, 527.25, 282.0)),
    96: ("https://budget-waltoncountyfl.com/pages/tourism-beach-operations.html", (474.0, 228.75, 527.25, 282.0)),
    97: ("https://budget-waltoncountyfl.com/pages/tourism-beach-operations.html", (474.0, 228.75, 527.25, 282.0)),
}
for _page_idx, (_url, _rect) in DEPARTMENT_QR.items():
    _uri(_page_idx, _url, _rect)

# Capital Improvement Plan QR
_uri(108, "https://budget-waltoncountyfl.com/pages/capital-improvement-plan.html", (59.25, 521.25, 111.0, 573.75))

add_baseline_structure(writer)
OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("wb") as stream:
    writer.write(stream)

print(f"Wrote {OUT} ({len(writer.pages)} pages)")
