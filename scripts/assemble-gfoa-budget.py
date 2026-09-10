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
add_range(writer, community, 1, 3)

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
add_range(writer, revenue, 1, 5)
add_range(writer, property_tax, 1, 2)
writer.add_page(enh.pages[8])
add_range(writer, expenses, 1, 3)
add_range(writer, funds, 1, 2)
writer.add_page(transfers.pages[0])
writer.add_page(debt.pages[0])

writer.add_page(divider_budget_process.pages[0])
add_range(writer, process, 1, 2)
writer.add_page(enh.pages[14])
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
add_range(writer, departments, 3, 37)

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
# Accountability (enh pages 12-14) moved here, right after the Capital
# Improvement Plan, instead of sitting in the Workforce Budget chapter --
# their subject is capital decision-making, which belongs with the rest
# of the capital plan. Long-Term Decisions (enh page 11) stays behind in
# Workforce Budget.
writer.add_page(divider_capital_budget.pages[0])
add_range(writer, cip, 1, 3)
writer.add_page(enh.pages[11])
writer.add_page(enh.pages[12])
writer.add_page(enh.pages[13])
add_range(writer, capital_ledgers, 1, 8)

# Glossary, Statistical, and Supplemental Information is now its own
# closing chapter with its own divider, not a subsection tucked inside
# Capital Budget. Statistical and Supplemental Information and Principal
# Property Taxpayers still lead it, right in front of the Glossary.
writer.add_page(divider_glossary.pages[0])
add_range(writer, base, 22, 23)

add_range(writer, glossary, 1, 9)
writer.add_page(back_cover())

EXPECTED_PAGES = 139
if len(writer.pages) != EXPECTED_PAGES:
    raise RuntimeError(f"Expected {EXPECTED_PAGES} pages, assembled {len(writer.pages)}")

# Renumber normal editorial pages. Full-bleed covers/dividers carry no footer.
skip_number = {1, 2, 8, 17, 39, 52, 56, 64, 68, 105, 112, 127, 139}
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
    ("Financial Overview", 17, None),
    ("Budget in Brief", 18, "Financial Overview"),
    ("Consolidated Budget Ledger", 19, "Financial Overview"),
    ("Budget Change Summary", 21, "Financial Overview"),
    ("Revenue Portfolio", 23, "Financial Overview"),
    ("Revenue Ledger", 24, "Financial Overview"),
    ("Property Tax Allocation Ledger", 29, "Financial Overview"),
    ("Florida Amendment 3 Risk", 31, "Financial Overview"),
    ("Expenditure Ledger", 32, "Financial Overview"),
    ("Fund Financial Ledger", 35, "Financial Overview"),
    ("Interfund Transfer Ledger", 37, "Financial Overview"),
    ("Debt Ledger", 38, "Financial Overview"),
    ("Budget Process", 39, None),
    ("Public Participation", 42, "Budget Process"),
    ("Financial Policies", 43, "Budget Process"),
    ("Public Value and Decision Guide", 45, "Budget Process"),
    ("Program and Service Budget", 47, "Public Value and Decision Guide"),
    ("Program Outcomes", 49, "Public Value and Decision Guide"),
    ("Revenue Strategy", 51, "Public Value and Decision Guide"),
    ("Workforce Budget", 52, None),
    ("Personnel Ledger", 54, "Workforce Budget"),
    ("Long-Term Decisions", 55, "Workforce Budget"),
    ("Constitutional Officers", 56, None),
    ("Other Agencies and Court-Related Functions", 64, None),
    ("Departments and Services", 68, None),
    ("Tourism Administration", 97, "Departments and Services"),
    ("Sales and Visitors Center", 98, "Tourism Administration"),
    ("Communications", 99, "Tourism Administration"),
    ("Marketing", 100, "Tourism Administration"),
    ("North Walton", 101, "Tourism Administration"),
    ("Beach Operations", 102, "Departments and Services"),
    ("Beach Renourishment", 103, "Beach Operations"),
    ("Beach Tram", 104, "Beach Operations"),
    ("Financial Plan", 105, None),
    ("Contractual Services Ledger", 106, "Financial Plan"),
    ("Long-Term Outlook", 110, "Financial Plan"),
    ("Capital Budget", 112, None),
    ("Capital Improvement Plan", 113, "Capital Budget"),
    ("Capital Portfolio", 116, "Capital Budget"),
    ("Major Project Decision Record", 117, "Capital Budget"),
    ("Glossary, Statistical, and Supplemental Information", 127, None),
    ("Statistical and Supplemental Information", 128, "Glossary, Statistical, and Supplemental Information"),
    ("Principal Property Taxpayers", 129, "Glossary, Statistical, and Supplemental Information"),
    ("Glossary and Frequently Asked Questions", 130, "Glossary, Statistical, and Supplemental Information"),
]
parents = {}
for title, page_number, parent_title in outline:
    parent = parents.get(parent_title)
    item = writer.add_outline_item(title, page_number - 1, parent=parent)
    parents[title] = item

no_border = ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)])
writer.add_uri(30, "https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110", (455, 65, 575, 185), border=no_border)
writer.add_uri(41, "https://walton.civicweb.net/filepro/documents/523125/", (455, 65, 575, 185), border=no_border)
writer.add_uri(138, "https://www.waltoncountyfl.gov", (438, 44, 575, 64), border=no_border)
writer.add_uri(138, "https://budget-waltoncountyfl.com/pages/full-budget-document.html", (393, 27, 575, 44), border=no_border)

add_baseline_structure(writer)
OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("wb") as stream:
    writer.write(stream)

print(f"Wrote {OUT} ({len(writer.pages)} pages)")
