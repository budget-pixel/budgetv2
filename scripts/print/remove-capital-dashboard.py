"""Remove the Capital Funding and Delivery Dashboard and swap in revised pages.

One-time structural update (2026-11-10) on the 143-page book:
  * swaps in the rebuilt contents, Reader's Guides, Constitutional Officers
    and Department Operating ledgers, Veteran Services profile, and the
    Capital Improvement Plan reconciliation page,
  * deletes the dashboard (page 120), which repeated the Capital
    Improvement Plan's reconciliation and largest commitments,
then renumbers footers, bookmarks, and contents links with
finalize-budget-book-order.py --renumber-only (142 pages).
"""
import json
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, NameObject

ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
SCRATCH = ROOT / "tmp/pdfs"
DASHBOARD = 120

reader = PdfReader(BOOK)
text = lambda page: " ".join((page.extract_text() or "").split())
if len(reader.pages) != 143 or "Capital Funding and Delivery Dashboard" not in text(reader.pages[DASHBOARD - 1]):
    sys.exit("Expected the 143-page book with the dashboard on page 120")

guides = json.loads((SCRATCH / "readers-guides.json").read_text())
# Page in the current (143-page) book -> (source pdf, page index, required text).
swaps = {
    5: ("page-order-toc.pdf", 0, "Introduction and Our County"),
    6: ("page-order-toc.pdf", 1, "Constitutional Officer Budget"),
    7: ("page-order-toc.pdf", 2, "Board Department Budgets"),
    56: ("constitutional-revised.pdf", 0, "Constitutional Officers and Board Office Ledger"),
    77: ("department-operating-revised.pdf", 0, "Department Operating Ledger"),
    89: ("departments-value-revised.pdf", 13, "Veteran Services"),
    119: ("cip-revised.pdf", 2, "Fund Reconciliation"),
}
for g in guides:
    # Guides after the dashboard sit one page later in the current book.
    current = g["newPage"] + (1 if g["newPage"] >= DASHBOARD else 0)
    swaps[current] = ("readers-guides.pdf", g["sourcePage"] - 1, "Guide")

writer = PdfWriter(clone_from=reader)
sources = {}
for page, (name, index, required) in sorted(swaps.items()):
    if required not in text(reader.pages[page - 1]):
        sys.exit(f"Page {page} does not contain {required!r}")
    sources.setdefault(name, PdfReader(SCRATCH / name))
    target = writer.pages[page - 1]
    target[NameObject("/Contents")] = ArrayObject()
    target[NameObject("/Resources")] = DictionaryObject()
    target.merge_page(sources[name].pages[index])

writer.remove_page(DASHBOARD - 1)
temp = SCRATCH / "budget-book-no-dashboard.pdf"
with temp.open("wb") as handle:
    writer.write(handle)
assert len(PdfReader(temp).pages) == 142
temp.replace(BOOK)
print(f"Swapped {len(swaps)} pages and removed the dashboard; renumbering...")
subprocess.run([sys.executable, str(ROOT / "scripts/print/finalize-budget-book-order.py"), "--renumber-only"], check=True)
