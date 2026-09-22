import os
import re
from typing import List, Dict, Any


class DocumentParser:
    """Extracts raw text, pages, and section headers from operational documents."""

    @staticmethod
    def parse_file(file_path: str) -> List[Dict[str, Any]]:
        """Parse file into a list of page dictionaries: [{'page': 1, 'text': '...'}]"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document file not found at {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return DocumentParser._parse_pdf(file_path)
        else:
            return DocumentParser._parse_text(file_path)

    @staticmethod
    def _parse_pdf(file_path: str) -> List[Dict[str, Any]]:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        pages_data = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_data.append({
                "page_number": idx + 1,
                "text": text.strip()
            })
        return pages_data

    @staticmethod
    def _parse_text(file_path: str) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Check for explicit Page markers e.g. "--- Page 42 ---" or "[Page 12]"
        page_pattern = re.compile(r'(?:---|\[)\s*Page\s+(\d+)\s*(?:---|\])', re.IGNORECASE)
        splits = page_pattern.split(content)

        if len(splits) > 1:
            pages_data = []
            # splits will be [intro, page_num_1, page_text_1, page_num_2, page_text_2, ...]
            if splits[0].strip():
                pages_data.append({"page_number": 1, "text": splits[0].strip()})

            for i in range(1, len(splits), 2):
                p_num = int(splits[i])
                p_text = splits[i+1].strip() if i + 1 < len(splits) else ""
                pages_data.append({"page_number": p_num, "text": p_text})
            return pages_data

        # Otherwise divide text into pages every ~300 words
        words = content.split()
        page_size = 300
        pages_data = []
        for i in range(0, len(words), page_size):
            p_text = " ".join(words[i:i+page_size])
            pages_data.append({
                "page_number": (i // page_size) + 1,
                "text": p_text
            })
        return pages_data
