import sys

from docx import Document


sys.stdout.reconfigure(encoding="utf-8")
path = r"D:\DLU\HocKy7\Do An Chuyen Nghanh\BaoCao\BaoCaoDACN_Nhom21.docx"
doc = Document(path)

for name in ["Normal", "DeMucCap1", "DeMucCap2", "DeMucCap3", "Hình ảnh", "Caption"]:
    if name not in doc.styles:
        continue
    style = doc.styles[name]
    font = style.font
    paragraph = style.paragraph_format
    print(
        name,
        "font=", font.name,
        "size=", font.size.pt if font.size else None,
        "bold=", font.bold,
        "italic=", font.italic,
        "align=", paragraph.alignment,
        "before=", paragraph.space_before.pt if paragraph.space_before else None,
        "after=", paragraph.space_after.pt if paragraph.space_after else None,
        "line=", paragraph.line_spacing,
    )

for index, section in enumerate(doc.sections):
    print(
        "section", index,
        "page=", section.page_width.inches, section.page_height.inches,
        "margins=", section.top_margin.inches, section.bottom_margin.inches,
        section.left_margin.inches, section.right_margin.inches,
    )

print("code styles=", [s.name for s in doc.styles if "Code" in s.name or "Mã" in s.name])
