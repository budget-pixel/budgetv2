"""Align department order, contents, bookmarks, and printed page numbers."""
from io import BytesIO
import json
from pathlib import Path
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
LAYOUT = json.loads((ROOT / "scripts/data/budget-book-page-order.json").read_text())
reader = PdfReader(BOOK)
footer_font = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
if not footer_font.exists():
    footer_font = ROOT / "assets/fonts/Lora-Bold.ttf"
pdfmetrics.registerFont(TTFont("BudgetFooter", str(footer_font)))
assert len(reader.pages) == 135
already_grouped = (reader.metadata or {}).get("/DepartmentProfileOrder") == "grouped-v1"
renumber_only = "--renumber-only" in sys.argv
order = list(range(1, 136))
if not already_grouped and not renumber_only:
    order[70:102] = [page + 1 for page in LAYOUT["departmentProfileOriginalPages"]]
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
    page = replacements.get(number, reader.pages[old-1])
    writer.add_page(page)
    number_footer(writer.pages[-1], number)


def copy_outline(items, parent=None):
    previous = parent
    for item in items:
        if isinstance(item, list):
            copy_outline(item, previous)
        else:
            old = reader.get_destination_page_number(item)+1
            previous = writer.add_outline_item(item.title, destinations[old]-1, parent=parent)


copy_outline(reader.outline)
metadata = {key: str(value) for key, value in (reader.metadata or {}).items() if value is not None}
metadata["/DepartmentProfileOrder"] = "grouped-v1" if already_grouped or not renumber_only else "original"
writer.add_metadata(metadata)
# Deduplicate embedded resources after page replacements and footer overlays.
writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
temporary = BOOK.with_suffix(".updated.pdf")
with temporary.open("wb") as handle:
    writer.write(handle)
assert len(PdfReader(temporary).pages) == 135
temporary.replace(BOOK)
print("Updated 135-page budget book: grouped profiles, contents, guide, bookmarks, and footer numbers.")
