"""Align department order, contents, bookmarks, and printed page numbers.

Also drops the assembly page listed in budget_book_layout.py, so the
published book has 134 pages.
"""
from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, FloatObject, NameObject, NumberObject
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from budget_book_layout import (ASSEMBLY_PAGES, PUBLISHED_PAGES, REMOVED_PAGE, REMOVED_TITLE,
                                assembly_destination, assembly_pages)

ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
LAYOUT = json.loads((ROOT / "scripts/data/budget-book-page-order.json").read_text())
reader = PdfReader(BOOK)
footer_font = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
if not footer_font.exists():
    footer_font = ROOT / "assets/fonts/Lora-Bold.ttf"
pdfmetrics.registerFont(TTFont("BudgetFooter", str(footer_font)))
source_pages = assembly_pages(reader)
removed_text = " ".join((source_pages[REMOVED_PAGE-1].extract_text() or "").split())
if removed_text and REMOVED_TITLE not in removed_text:
    raise RuntimeError(f"Assembly page {REMOVED_PAGE} is not the page to remove: {removed_text[:80]!r}")
already_grouped = (reader.metadata or {}).get("/DepartmentProfileOrder") == "grouped-v1"
renumber_only = "--renumber-only" in sys.argv
order = list(range(1, ASSEMBLY_PAGES + 1))
if not already_grouped and not renumber_only:
    order[70:102] = [page + 1 for page in LAYOUT["departmentProfileOriginalPages"]]
order.remove(REMOVED_PAGE)
destinations = {old: new for new, old in enumerate(order, 1)}


def multiply(a, b):
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]


def number_footer(page, number):
    # Remove the old number's text object, retaining the footer rule and label.
    content = page.get_contents()
    if content is None or "FY 2027 FINAL BUDGET" not in (page.extract_text() or "").upper():
        return
    matrix = [1, 0, 0, 1, 0, 0]
    stack, kept, block = [], [], None
    footer_block = False
    removed = False
    for operands, operator in content.operations:
        if operator == b"q":
            stack.append(matrix[:])
        elif operator == b"Q":
            matrix = stack.pop()
        elif operator == b"cm":
            matrix = multiply(matrix, list(map(float, operands)))
        if operator == b"BT":
            block, footer_block = [], False
        if block is not None:
            block.append((operands, operator))
            if operator == b"Tm":
                x, y = map(float, operands[-2:])
                px = matrix[0]*x + matrix[2]*y + matrix[4]
                py = matrix[1]*x + matrix[3]*y + matrix[5]
                footer_block |= px > float(page.mediabox.width)-110 and 0 < py < 42
            if operator == b"ET":
                if footer_block:
                    removed = True
                else:
                    kept.extend(block)
                block = None
        else:
            kept.append((operands, operator))
    if not removed:
        return  # Cover/divider pages have no printed footer number.
    content.operations = kept
    page.replace_contents(content)
    buffer = BytesIO()
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    overlay = canvas.Canvas(buffer, pagesize=(width, height))
    overlay.setFillColorRGB(0.408, 0.471, 0.435)
    overlay.setFont("BudgetFooter", 7.5)
    overlay.drawRightString(width-45, 23, str(number))
    overlay.save()
    page.merge_page(PdfReader(buffer).pages[0])


replacements = {}
if not renumber_only:
    toc = PdfReader(ROOT / "tmp/pdfs/page-order-toc.pdf")
    guide = PdfReader(ROOT / "tmp/pdfs/page-order-capital-guide.pdf")
    replacements = {5: toc.pages[0], 6: toc.pages[1], 7: toc.pages[2], 108: guide.pages[0]}
writer = PdfWriter()
for number, old in enumerate(order, 1):
    page = replacements.get(number, source_pages[old-1])
    writer.add_page(page)
    number_footer(writer.pages[-1], number)


def copy_outline(items, parent=None):
    previous = parent
    for item in items:
        if isinstance(item, list):
            copy_outline(item, previous)
        else:
            old = assembly_destination(reader, item)
            if old not in destinations:
                continue  # bookmark for the removed page
            previous = writer.add_outline_item(item.title, destinations[old]-1, parent=parent)


copy_outline(reader.outline)

# Clickable table of contents. The contents pages are rendered separately
# (build-main-toc.mjs), so their rows carry no PDF links of their own. Each
# row is a small (6-8pt) title in one of the two columns followed by its page
# number; cover the row with an internal link to that page. Earlier internal
# links are removed first so re-running this script never stacks them.
CONTENTS_PAGES = (5, 6, 7)
CONTENTS_COLUMN_END = {"left": 300, "right": 571}


def link_contents_page(page_number):
    page = writer.pages[page_number - 1]
    annots = page.get("/Annots")
    if annots:
        kept = [a for a in annots if a.get_object().get("/Subtype") != "/Link" or "/Dest" not in a.get_object()]
        if kept:
            page[NameObject("/Annots")] = ArrayObject(kept)
        else:
            del page["/Annots"]
    runs = []
    page.extract_text(visitor_text=lambda text, cm, tm, font, size: runs.append(
        (text.strip(), tm[4]*cm[0] + tm[5]*cm[2] + cm[4], tm[4]*cm[1] + tm[5]*cm[3] + cm[5], size * abs(cm[0] or 1))))
    runs = [run for run in runs if run[0]]
    links = 0
    for index, (title, x, y, size) in enumerate(runs[:-1]):
        target = runs[index + 1][0]
        # A department rollup heading ("Environmental Services" over its
        # offices) has no page of its own; link it to its first office.
        if target == "DEPARTMENT ROLLUP":
            target = next((run[0] for run in runs[index + 2:index + 6] if run[0].isdigit()), "")
        # y > 60 skips the page footer ("FY 2027 FINAL BUDGET" and its number).
        if not 6 <= size <= 8.2 or not (40 < x < 345) or y < 60 or not target.isdigit():
            continue
        target = int(target)
        if not 1 <= target <= len(writer.pages):
            continue
        column_end = CONTENTS_COLUMN_END["left" if x < 300 else "right"]
        # An explicit page reference, not a bare page index, so every viewer
        # (Preview, Acrobat, browsers) follows the link.
        link = DictionaryObject({
            NameObject("/Type"): NameObject("/Annot"),
            NameObject("/Subtype"): NameObject("/Link"),
            NameObject("/Rect"): ArrayObject([FloatObject(v) for v in (x - 3, y - 3, column_end, y + size + 1.5)]),
            NameObject("/Border"): ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)]),
            NameObject("/Dest"): ArrayObject([writer.pages[target - 1].indirect_reference, NameObject("/Fit")]),
        })
        page.setdefault(NameObject("/Annots"), ArrayObject()).append(writer._add_object(link))
        links += 1
    return links


contents_links = sum(link_contents_page(number) for number in CONTENTS_PAGES)
if contents_links < 40:
    raise RuntimeError(f"Only {contents_links} contents links found; check the contents page layout")
metadata ={key: str(value) for key, value in (reader.metadata or {}).items() if value is not None}
metadata["/DepartmentProfileOrder"] = "grouped-v1" if already_grouped or not renumber_only else "original"
writer.add_metadata(metadata)
# Deduplicate embedded resources after page replacements and footer overlays.
writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
temporary = BOOK.with_suffix(".updated.pdf")
with temporary.open("wb") as handle:
    writer.write(handle)
assert len(PdfReader(temporary).pages) == PUBLISHED_PAGES
temporary.replace(BOOK)
print(f"Updated {PUBLISHED_PAGES}-page budget book: grouped profiles, contents ({contents_links} links), guide, bookmarks, and footer numbers.")
# Keep the web copy small: merged sections otherwise carry duplicate images
# and fonts (see optimize-budget-book.py).
subprocess.run([sys.executable, str(ROOT / "scripts/print/optimize-budget-book.py"), str(BOOK)], check=True)
