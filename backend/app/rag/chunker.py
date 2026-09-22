import re
from typing import List, Dict, Any, Optional


class DocumentChunker:
    """Chunks parsed document pages using a sliding window while preserving section titles and page numbers."""

    def __init__(self, chunk_size: int = 400, overlap: int = 100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def _extract_section_title(self, text: str) -> Optional[str]:
        """Detect markdown headings, chapter/section labels, or error code headers."""
        lines = text.strip().split("\n")
        for line in lines:
            line_s = line.strip()
            # Check for Markdown headers like ## Section Name
            if line_s.startswith("#"):
                return line_s.lstrip("#").strip()
            # Check for SECTION X / CHAPTER X / STEP X
            if re.match(r'^(?:SECTION|CHAPTER|PART|MODULE|STEP|PROCEDURE|TROUBLESHOOTING)\s+[\dA-Z\.\:\-]+', line_s, re.IGNORECASE):
                return line_s[:100]
            # Check for Error Code headers like "ERROR CODE E-204:" or "Fault Code:"
            if re.match(r'^(?:ERROR\s+CODE|FAULT\s+CODE|ALARM)\s+[\dA-Z\.\:\-]+', line_s, re.IGNORECASE):
                return line_s[:100]
            # Check for all-caps short titles like "SPINDLE BEARING OVERHAUL"
            if len(line_s) >= 4 and len(line_s) <= 60 and line_s.isupper():
                return line_s
        return None

    def chunk_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Split parsed pages into overlapping chunks with section context.
        
        Input: list of {"page_number": int, "text": str}
        Output: list of {
            "chunk_index": int,
            "page_number": int,
            "section_title": str,
            "content": str
        }
        """
        all_chunks = []
        chunk_idx = 0
        current_section = "General Overview"

        for page in pages:
            page_num = page.get("page_number", 1)
            page_text = page.get("text", "").strip()
            if not page_text:
                continue

            detected_section = self._extract_section_title(page_text)
            if detected_section:
                current_section = detected_section

            words = page_text.split()
            if not words:
                continue

            # If page text is within chunk size, create single chunk
            if len(words) <= self.chunk_size:
                all_chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "section_title": current_section,
                    "content": page_text
                })
                chunk_idx += 1
                continue

            # Sliding window with overlap
            step = max(1, self.chunk_size - self.overlap)
            start = 0
            while start < len(words):
                end = min(start + self.chunk_size, len(words))
                chunk_words = words[start:end]
                chunk_str = " ".join(chunk_words)

                # Check if this sub-chunk starts with a section header
                sub_section = self._extract_section_title(chunk_str)
                if sub_section:
                    current_section = sub_section

                all_chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "section_title": current_section,
                    "content": chunk_str
                })
                chunk_idx += 1

                if end == len(words):
                    break
                start += step

        return all_chunks
