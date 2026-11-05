"""Shared page layout for the FY 2027 budget book scripts.

The assembly scripts work in a fixed 135-page "assembly" numbering (every
page map, manifest, and replacement list is written against it). The
published book drops one of those pages -- the "Where FY 2027 Capital
Investment Serves" map at assembly page 112 -- so it has 134 pages.

finalize-budget-book-order.py removes that page as its last structural step.
Scripts that read an already-published (134-page) book first call
assembly_pages() to put a blank placeholder back in its slot, so their
assembly-numbered logic keeps working unchanged.
"""
from pypdf import PageObject

ASSEMBLY_PAGES = 135
REMOVED_PAGE = 112
REMOVED_TITLE = "Where FY 2027 Capital Investment Serves"
PUBLISHED_PAGES = ASSEMBLY_PAGES - 1


def published_number(assembly_number):
    """Printed/physical page in the published book, or None if removed."""
    if assembly_number == REMOVED_PAGE:
        return None
    return assembly_number - (assembly_number > REMOVED_PAGE)


def assembly_number(published):
    return published + (published >= REMOVED_PAGE)


def is_published(reader):
    return len(reader.pages) == PUBLISHED_PAGES


def assembly_pages(reader):
    """The reader's pages in assembly order (135), with a blank placeholder
    in the removed page's slot when the reader is a published book."""
    pages = list(reader.pages)
    if len(pages) == ASSEMBLY_PAGES:
        return pages
    if len(pages) != PUBLISHED_PAGES:
        raise RuntimeError(f"Unexpected budget book length: {len(pages)} pages")
    box = pages[0].mediabox
    pages.insert(REMOVED_PAGE - 1, PageObject.create_blank_page(width=float(box.width), height=float(box.height)))
    return pages


def assembly_destination(reader, item):
    """1-based assembly page number of an outline item in the reader."""
    number = reader.get_destination_page_number(item) + 1
    return assembly_number(number) if is_published(reader) else number
