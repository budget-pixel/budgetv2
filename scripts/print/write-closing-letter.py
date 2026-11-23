"""Place the closing letter immediately before the budget book back cover.

The page itself is built by build-closing-letter.mjs (HTML, same header,
footer, and type as the transmittal letter); this script renders it with the
right page number and inserts it, replacing any closing letter already there.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
book = Path(sys.argv[1])
MARKER = "Thank you for reading"

with fitz.open(book) as doc:
    toc = doc.get_toc(simple=True)
    if MARKER in doc[-2].get_text():
        doc.delete_page(len(doc) - 2)
    number = len(doc)  # letter lands just before the back cover
    with tempfile.TemporaryDirectory() as tmp:
        letter_path = Path(tmp) / "closing-letter.pdf"
        subprocess.run(["node", str(ROOT / "scripts/print/build-closing-letter.mjs"), str(letter_path), str(number)],
                       check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
        with fitz.open(letter_path) as letter:
            doc.insert_pdf(letter, from_page=0, to_page=0, start_at=len(doc) - 1)
    doc.set_toc(toc)
    temporary = book.with_suffix(".letter.pdf")
    doc.save(temporary, garbage=3, deflate=True)
temporary.replace(book)
print(f"Closing letter placed as page {number}.")
