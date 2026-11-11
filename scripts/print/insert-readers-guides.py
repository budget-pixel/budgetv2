"""Insert the Reader's Guide pages into the 134-page budget book.

One-time structural update (2026-11-10). Reads the published book and
tmp/pdfs/readers-guides.pdf (+ .json manifest from build-readers-guides.mjs),
then:
  * inserts each new guide after its section divider (and the overall guide
    after the contents),
  * replaces the two pages that were already guides (Financial Overview and
    Capital Budget),
  * replaces the contents pages and the pages whose text cites other pages,
  * adds a bookmark for every guide.
Footers, bookmarks, and contents links are then renumbered by
finalize-budget-book-order.py --renumber-only.

Usage: python3 scripts/print/insert-readers-guides.py
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
OLD_PAGES = 134

reader = PdfReader(BOOK)
if len(reader.pages) != OLD_PAGES:
    sys.exit(f"Expected the {OLD_PAGES}-page book; found {len(reader.pages)} pages (already updated?)")
text = lambda page: " ".join((page.extract_text() or "").split())

guides_pdf = PdfReader(SCRATCH / "readers-guides.pdf")
manifest = json.loads((SCRATCH / "readers-guides.json").read_text())
insert_after = sorted(g["insertAfter"] for g in manifest if "insertAfter" in g)
new_page = lambda n: n + sum(1 for p in insert_after if n > p)

# Old page -> (replacement pdf, page index, text that must be on the old page).
replacements = {
    5: (SCRATCH / "page-order-toc.pdf", 0, "Introduction and Our County"),
    6: (SCRATCH / "page-order-toc.pdf", 1, "Constitutional Officer Budget"),
    7: (SCRATCH / "page-order-toc.pdf", 2, "Board Department Budgets"),
    14: (SCRATCH / "community-priorities-revised.pdf", 0, "Community Priorities"),
    15: (SCRATCH / "community-priorities-revised.pdf", 1, "Organizational Challenges"),
    16: (SCRATCH / "community-priorities-revised.pdf", 2, "FY 2027 Response"),  # renamed "Budget Response" later
    42: (SCRATCH / "long-term-outlook-revised.pdf", 0, "Long-Term Outlook"),
    43: (SCRATCH / "long-term-outlook-revised.pdf", 1, "Long-Term Outlook"),
    45: (SCRATCH / "budget-process-revised.pdf", 0, "Budget Process"),
    46: (SCRATCH / "budget-process-revised.pdf", 1, "Budget Process"),
    47: (SCRATCH / "budget-process-revised.pdf", 2, "Budget Calendar"),
}
for g in manifest:
    if "replaces" in g:
        expected = {18: "Financial Overview Roadmap", 108: "Capital Budget"}[g["replaces"]]
        replacements[g["replaces"]] = (SCRATCH / "readers-guides.pdf", g["sourcePage"] - 1, expected)

writer = PdfWriter(clone_from=reader)
sources = {}
for old, (path, index, expected) in replacements.items():
    if expected not in text(reader.pages[old - 1]):
        sys.exit(f"Old page {old} does not contain {expected!r}")
    sources.setdefault(path, PdfReader(path))
    target = writer.pages[old - 1]
    target[NameObject("/Contents")] = ArrayObject()
    target[NameObject("/Resources")] = DictionaryObject()
    target.merge_page(sources[path].pages[index])

# Insert from the back so earlier insertion points keep their index.
for g in sorted((g for g in manifest if "insertAfter" in g), key=lambda g: -g["insertAfter"]):
    writer.insert_page(guides_pdf.pages[g["sourcePage"] - 1], g["insertAfter"])

# Rebuild the bookmarks: same tree, plus each section's guide as its first
# child and the overall guide after the Budget Message.
old_index = {id(page.indirect_reference.idnum): i for i, page in enumerate(reader.pages)}


def outline_tree(items):
    tree, last = [], None
    for item in items:
        if isinstance(item, list):
            last["children"] = outline_tree(item)
        else:
            last = {"title": item.title, "old": reader.get_destination_page_number(item) + 1, "children": []}
            tree.append(last)
    return tree


tree = outline_tree(reader.outline)
section_guides = {g["section"]: g for g in manifest if g["key"] not in ("overall", "financial", "capital")}
section_guides["Other Agencies and Court-Related Functions Budget"] = section_guides.pop("Other Agencies and Court-Related Functions")
section_guides["Glossary, Statistical, and Supplemental Information"] = section_guides.pop("Glossary, Statistical, and Supplemental Information")
for node in tree:
    guide = section_guides.get(node["title"])
    if guide:
        node["children"].insert(0, {"title": "Reader’s Guide", "new": guide["newPage"], "children": []})
    if node["title"] == "Capital Budget":
        capital = next(g for g in manifest if g["key"] == "capital")
        node["children"].insert(0, {"title": "Reader’s Guide", "new": capital["newPage"], "children": []})
    for child in node["children"]:
        if child["title"] == "Financial Overview Roadmap":
            child["title"] = "Reader’s Guide"
overall = next(g for g in manifest if g["key"] == "overall")
tree.insert(1, {"title": "Reader’s Guide to the FY 2027 Budget", "new": overall["newPage"], "children": []})
missing = [t for t in section_guides if t not in {n["title"] for n in tree}]
if missing:
    sys.exit(f"No bookmark for sections: {missing}")

if "/Outlines" in writer._root_object:
    del writer._root_object["/Outlines"]


def add(nodes, parent=None):
    for node in nodes:
        page = node.get("new") or new_page(node["old"])
        item = writer.add_outline_item(node["title"], page - 1, parent=parent)
        add(node["children"], item)


add(tree)

new_count = OLD_PAGES + len(insert_after)
temp = SCRATCH / "budget-book-readers-guides.pdf"
with temp.open("wb") as handle:
    writer.write(handle)
check = PdfReader(temp)
assert len(check.pages) == new_count, len(check.pages)
for g in manifest:
    page_text = text(check.pages[g["newPage"] - 1])
    assert "Reader’s Guide" in page_text or "Reader's Guide" in page_text, (g["key"], page_text[:80])
temp.replace(BOOK)
print(f"Inserted {len(insert_after)} guides; book now {new_count} pages. Renumbering footers and contents links...")
subprocess.run([sys.executable, str(ROOT / "scripts/print/finalize-budget-book-order.py"), "--renumber-only"], check=True)
