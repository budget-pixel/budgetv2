"""Shrink the budget book PDF for faster loading on the website.

Each section PDF is built separately and merged, so the book carries
duplicate copies of the same images, fonts, and objects, plus photos at far
more resolution than they print at (commissioner portraits were 2600px wide
for a 1.6in placement). This rewrites the book in place:

  * images shown smaller than their pixel size are resampled to MAX_DPI
    (300, full print quality) at their largest placement in the book;
  * matching font subsets are merged and duplicate objects removed.

The text layer, bookmarks, links, and metadata are checked against the
original before the file is replaced. Safe to run repeatedly.

Usage: python3 scripts/optimize-budget-book.py [path/to/book.pdf]
"""
from pathlib import Path
import os
import sys

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
BOOK = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "output/pdf/walton-county-fy2027-budget-book.pdf"
MAX_DPI = 300
JPEG_QUALITY = 85


def largest_placements(doc):
    """Widest on-page width (points) of each image xref across the book."""
    placements = {}
    for page in doc:
        for info in page.get_images(full=True):
            xref, smask, width, height = info[0], info[1], info[2], info[3]
            for rect in page.get_image_rects(xref):
                if rect.width > placements.get(xref, (0,))[0]:
                    placements[xref] = (rect.width, smask, width, height)
    return placements


def resample_images(doc):
    changed = 0
    for xref, (shown_width, smask, width, height) in largest_placements(doc).items():
        if smask:
            continue  # leave images with transparency masks untouched
        target_width = int(round(shown_width / 72 * MAX_DPI))
        if target_width >= width * 0.85:
            continue
        try:
            pixmap = fitz.Pixmap(doc, xref)
        except Exception:
            continue
        if pixmap.colorspace and pixmap.colorspace.n == 4:
            pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
        if pixmap.alpha:
            continue
        target_height = max(1, int(round(height * target_width / width)))
        smaller = fitz.Pixmap(pixmap, target_width, target_height, None)
        is_jpeg = "DCT" in doc.xref_get_key(xref, "Filter")[1]
        data = smaller.tobytes("jpeg", jpg_quality=JPEG_QUALITY) if is_jpeg else smaller.tobytes("png")
        if len(data) >= len(doc.xref_stream_raw(xref)):
            continue
        doc[0].replace_image(xref, stream=data)
        changed += 1
    return changed


def snapshot(doc):
    return {
        "pages": len(doc),
        "text": [page.get_text() for page in doc],
        "toc": doc.get_toc(),
        "links": sum(len(page.get_links()) for page in doc),
        "info_keys": info_keys(doc),
    }


def info_keys(doc):
    """Keys of the document Info dictionary, including custom ones such as
    /DepartmentProfileOrder written by finalize-budget-book-order.py."""
    kind, value = doc.xref_get_key(-1, "Info")
    return set(doc.xref_get_keys(int(value.split()[0]))) if kind == "xref" else set()


original_size = os.path.getsize(BOOK)
doc = fitz.open(BOOK)
before = snapshot(doc)
resized = resample_images(doc)
try:
    doc.subset_fonts()
except Exception as error:  # fontTools missing or a font it cannot subset
    print(f"Font merge skipped: {error}")
temporary = BOOK.with_suffix(".optimized.pdf")
doc.save(temporary, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, clean=True)
doc.close()

check = fitz.open(temporary)
after = snapshot(check)
check.close()
for key in ("pages", "text", "toc", "links"):
    if before[key] != after[key]:
        temporary.unlink()
        raise RuntimeError(f"Optimized book failed {key} validation; original left unchanged")
if before["info_keys"] - after["info_keys"]:
    temporary.unlink()
    raise RuntimeError("Optimized book lost document metadata; original left unchanged")

temporary.replace(BOOK)
print(f"Optimized {BOOK.name}: {original_size / 1e6:.1f} MB -> {os.path.getsize(BOOK) / 1e6:.1f} MB ({resized} images resampled)")
