"""Small dependency-free PDF certificate renderer."""
from datetime import datetime


def _pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def render_certificate_pdf(student_name: str, course_title: str, issued_at: datetime, certificate_id: str) -> bytes:
    lines = [
        "BT /F1 18 Tf 320 550 Td (CAREERVUE) Tj ET",
        "BT /F1 30 Tf 185 475 Td (Certificate of Completion) Tj ET",
        "BT /F1 14 Tf 345 410 Td (Presented to) Tj ET",
        f"BT /F1 26 Tf 250 360 Td ({_pdf_text(student_name)}) Tj ET",
        "BT /F1 14 Tf 255 305 Td (for successfully completing the course) Tj ET",
        f"BT /F1 20 Tf 230 255 Td ({_pdf_text(course_title)}) Tj ET",
        f"BT /F1 11 Tf 72 100 Td (Issued: {issued_at.date().isoformat()}) Tj ET",
        f"BT /F1 9 Tf 330 100 Td (Certificate ID: {_pdf_text(certificate_id)}) Tj ET",
    ]
    stream = "\n".join(lines).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    )
    return bytes(output)
