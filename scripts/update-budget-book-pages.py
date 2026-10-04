"""Replace revised page ranges in the assembled FY 2027 budget book."""

from pathlib import Path
import sys
from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
SCRATCH = ROOT / "tmp/pdfs"

# Physical, one-based PDF pages. The printed page numbers start two pages later.
SOURCES = [
    (3, SCRATCH / "transmittal-letter-revised.pdf", 1, "Transmittal Letter"),
    (15, SCRATCH / "community-priorities-revised.pdf", 2, "Organizational Challenges"),
    (40, SCRATCH / "reserve-position-revised.pdf", 3, "General Fund Reserve Position"),
    (47, SCRATCH / "gfoa-enhancements-revised.pdf", 12, "Public Participation and Decision Record"),
    (36, SCRATCH / "fund-financial-revised.pdf", 1, "Fund Financial Ledger"),
    (37, SCRATCH / "fund-financial-revised.pdf", 2, "Fund Financial Ledger"),
    (41, SCRATCH / "long-term-outlook-revised.pdf", 1, "Long-Term Outlook"),
    (42, SCRATCH / "long-term-outlook-revised.pdf", 2, "Long-Term Outlook"),
    (20, SCRATCH / "consolidated-ledger-revised.pdf", 1, "Consolidated Budget Ledger"),
    (21, SCRATCH / "consolidated-ledger-revised.pdf", 2, "Consolidated Budget Ledger"),
    (51, SCRATCH / "constitutional-revised.pdf", 1, "Constitutional Officers"),
    (52, SCRATCH / "constitutional-revised.pdf", 2, "Walton County Sheriff's Office"),
    (53, SCRATCH / "constitutional-revised.pdf", 3, "Board of County Commissioners"),
    (69, SCRATCH / "department-operating-revised.pdf", 1, "Department Operating Ledger"),
    (54, SCRATCH / "constitutional-revised.pdf", 4, "Tax Collector"),
    (55, SCRATCH / "constitutional-revised.pdf", 5, "Clerk of Courts"),
    (56, SCRATCH / "constitutional-revised.pdf", 6, "Property Appraiser"),
    (57, SCRATCH / "constitutional-revised.pdf", 7, "Supervisor of Elections"),
    (59, SCRATCH / "independent-revised.pdf", 1, "Independent Agencies Ledger"),
    (60, SCRATCH / "independent-revised.pdf", 2, "Independent Agencies Ledger"),
    (64, SCRATCH / "gfoa-enhancements-revised.pdf", 3, "PROGRAM ACCOUNTABILITY"),
    (63, SCRATCH / "gfoa-enhancements-revised.pdf", 1, "What Residents Receive"),
    (65, SCRATCH / "gfoa-enhancements-revised.pdf", 4, "PROGRAM ACCOUNTABILITY"),
    (66, SCRATCH / "gfoa-enhancements-revised.pdf", 5, "PROGRAM ACCOUNTABILITY"),
    (67, SCRATCH / "gfoa-enhancements-revised.pdf", 6, "PROGRAM ACCOUNTABILITY"),
    (17, SCRATCH / "budget-in-brief-revised.pdf", 1, "Budget in Brief"),
    (22, SCRATCH / "change-summary-revised.pdf", 1, "Budget Change Summary"),
    (23, SCRATCH / "change-summary-revised.pdf", 2, "Budget Change Summary"),
    (24, SCRATCH / "gfoa-enhancements-revised.pdf", 8, "REVENUE PORTFOLIO"),
    (103, SCRATCH / "gfoa-enhancements-revised.pdf", 10, "People, Cost and Capacity"),
    (26, SCRATCH / "revenue-ledger-revised.pdf", 1, "Revenue Ledger"),
    (27, SCRATCH / "revenue-ledger-revised.pdf", 2, "Revenue Ledger"),
    (28, SCRATCH / "revenue-ledger-revised.pdf", 3, "Revenue Ledger"),
    (29, SCRATCH / "revenue-ledger-revised.pdf", 4, "Revenue Ledger"),
    (30, SCRATCH / "property-tax-revised.pdf", 1, "Property Tax Allocation"),
    (31, SCRATCH / "property-tax-revised.pdf", 2, "Property Tax Allocation"),
    (33, SCRATCH / "expenditure-ledger-revised.pdf", 1, "Expenditure Ledger"),
    (34, SCRATCH / "expenditure-ledger-revised.pdf", 2, "Expenditure Ledger"),
    (35, SCRATCH / "expenditure-ledger-revised.pdf", 3, "Expenditure Ledger"),
    (38, SCRATCH / "interfund-transfer-revised.pdf", 1, "Interfund Transfer Ledger"),
    (39, SCRATCH / "debt-ledger-revised.pdf", 1, "Debt Ledger"),
    (106, SCRATCH / "capital-toc-revised.pdf", 1, "Capital Budget"),
    (114, SCRATCH / "capital-tourism-revised.pdf", 3, "Tourist Development Fund Capital Ledger"),
    (120, SCRATCH / "capital-tourism-revised.pdf", 9, "Machinery, Vehicles"),
]
SOURCES += [(physical, SCRATCH / "departments-value-revised.pdf", physical - 67,
             "TOURISM ADMINISTRATION OFFICE" if 96 <= physical <= 99 else
             "BEACH OPERATIONS OFFICE" if physical >= 100 else "DEPARTMENTS")
            for physical in range(70, 102)]

# Optional physical page numbers keep a focused update from reapplying
# unrelated intermediate exports from earlier revisions.
if len(sys.argv) > 1:
    requested_pages = {int(value) for value in sys.argv[1:]}
    known_pages = {item[0] for item in SOURCES}
    if not requested_pages <= known_pages:
        raise ValueError("Requested pages are not available in the replacement sources")
    SOURCES = [item for item in SOURCES if item[0] in requested_pages]

original = PdfReader(BOOK)
if len(original.pages) != 133:
    raise RuntimeError("The existing book is not the expected 133-page edition")

replacements = {}
readers = {}
for physical_page, source_path, source_page, expected_title in SOURCES:
    if source_path not in readers:
        readers[source_path] = PdfReader(source_path)
    source = readers[source_path]
    old_text = original.pages[physical_page - 1].extract_text() or ""
    new_text = source.pages[source_page - 1].extract_text() or ""
    if expected_title not in old_text or expected_title not in new_text:
        raise RuntimeError(f"Unexpected content at physical page {physical_page}")
    replacements[physical_page - 1] = source.pages[source_page - 1]

writer = PdfWriter()
for index, page in enumerate(original.pages):
    writer.add_page(replacements.get(index, page))

if original.metadata:
    writer.add_metadata({key: str(value) for key, value in original.metadata.items() if value is not None})


def copy_outline(items, parent=None):
    previous = parent
    for item in items:
        if isinstance(item, list):
            copy_outline(item, previous)
            continue
        target = original.get_destination_page_number(item)
        previous = writer.add_outline_item(item.title, target, parent=parent)


copy_outline(original.outline)
temp = SCRATCH / "walton-county-fy2027-budget-book-updated.pdf"
with temp.open("wb") as handle:
    writer.write(handle)

checked = PdfReader(temp)
if len(checked.pages) != 133 or len(checked.outline) != len(original.outline):
    raise RuntimeError("Updated book failed page-count or outline validation")
temp.replace(BOOK)
print(f"Updated {BOOK} ({len(replacements)} revised pages)")
