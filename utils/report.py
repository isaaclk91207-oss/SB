import os
from datetime import datetime
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from utils.translations import get_text, get_class_text, get_action_text

FONT_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "NotoSansMyanmar-Regular.ttf")

# Register Myanmar font
MYANMAR_FONT = "NotoSansMyanmar"
try:
    pdfmetrics.registerFont(TTFont(MYANMAR_FONT, FONT_PATH))
except Exception as e:
    print(f"[PDF] Font registration failed: {e}")
    MYANMAR_FONT = "Helvetica"


def draw_wrapped_text(c, text, x, y, max_width, font_name, font_size, color="#333333"):
    """Draw text with word wrapping. Returns new y position."""
    c.setFont(font_name, font_size)
    c.setFillColor(HexColor(color))
    words = text.split()
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        if c.stringWidth(test, font_name, font_size) < max_width:
            line = test
        else:
            c.drawString(x, y, line)
            y -= font_size + 4
            line = word
    if line:
        c.drawString(x, y, line)
        y -= font_size + 4
    return y


def generate_report(output_path, photo: Image.Image, heatmap: Image.Image,
                    priority: str, confidence: float, lang: str):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # Determine fonts based on language
    if lang == "my":
        heading_font = MYANMAR_FONT
        body_font = MYANMAR_FONT
    else:
        heading_font = "Helvetica-Bold"
        body_font = "Helvetica"

    # --- 1. Header ---
    c.setFont(heading_font, 18)
    c.drawString(50, height - 40, "Safe AI (SafeBuild Myanmar)")

    c.setFont(body_font, 11)
    c.drawString(50, height - 58, get_text(lang, "app_subtitle"))

    # --- 2. Boundary Notice ---
    y = height - 80
    c.setFont(body_font, 8)
    c.setFillColor(HexColor("#e74c3c"))
    boundary = get_text(lang, "boundary_notice")
    y = draw_wrapped_text(c, boundary, 50, y, width - 100, body_font, 8, color="#e74c3c")
    c.setFillColor(HexColor("#333333"))
    y -= 10

    # --- 3. Save temp images ---
    photo_path = os.path.join(os.path.dirname(__file__), "..", "temp_photo.jpg")
    heatmap_path = os.path.join(os.path.dirname(__file__), "..", "temp_heatmap.jpg")
    photo.save(photo_path, "JPEG", quality=90)
    heatmap.save(heatmap_path, "JPEG", quality=90)

    # --- 4. Photo + Heatmap side by side ---
    img_y = y - 220
    c.drawImage(photo_path, 50, img_y, width=240, height=200)
    c.drawImage(heatmap_path, 310, img_y, width=240, height=200)

    # Labels under images
    c.setFont(body_font, 9)
    c.drawString(50, img_y - 15, get_text(lang, "pdf_photo"))
    c.drawString(310, img_y - 15, get_text(lang, "pdf_evidence"))

    # --- 5. Result Section ---
    y = img_y - 40

    # Result header
    c.setFont(heading_font, 14)
    c.drawString(50, y, get_text(lang, "result_title"))
    y -= 22

    # Priority with color
    colors = {"low": "#27ae60", "medium": "#f39c12", "high": "#e74c3c"}
    color = colors.get(priority, "#333333")

    c.setFont(heading_font, 11)
    c.setFillColor(HexColor(color))
    priority_text = f"{get_text(lang, 'priority_label')}: {get_class_text(lang, priority)}"
    c.drawString(50, y, priority_text)
    y -= 18

    # Priority description
    c.setFont(body_font, 10)
    desc_key = f"priority_{priority}_desc"
    c.drawString(70, y, f"— {get_text(lang, desc_key)}")
    c.setFillColor(HexColor("#333333"))
    y -= 22

    # Confidence
    c.setFont(body_font, 10)
    c.drawString(50, y, f"{get_text(lang, 'confidence_label')}: {confidence:.1%}")
    y -= 25

    # --- 6. Action Guidance ---
    c.setFont(heading_font, 11)
    c.drawString(50, y, get_text(lang, "action_label"))
    y -= 18

    action_text = get_action_text(lang, priority)
    y = draw_wrapped_text(c, action_text, 70, y, width - 120, body_font, 10)
    y -= 15

    # --- 7. Note (Caveat) ---
    c.setFont(heading_font, 10)
    c.setFillColor(HexColor("#e74c3c"))
    c.drawString(50, y, get_text(lang, "caveat_label"))
    y -= 16

    caveat_text = get_text(lang, "caveat")
    y = draw_wrapped_text(c, caveat_text, 70, y, width - 120, body_font, 9, color="#e74c3c")
    c.setFillColor(HexColor("#333333"))
    y -= 15

    # --- 8. Evidence Description ---
    c.setFont(body_font, 9)
    evidence_text = get_text(lang, "evidence_label")
    y = draw_wrapped_text(c, evidence_text, 50, y, width - 100, body_font, 9)
    y -= 15

    # --- 9. Timestamp ---
    c.setFont(body_font, 9)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.drawString(50, y, f"{get_text(lang, 'pdf_timestamp')}: {timestamp}")
    y -= 18

    # --- 10. Footer ---
    c.setFont(body_font, 8)
    c.setFillColor(HexColor("#666666"))
    c.drawString(50, y, get_text(lang, "footer"))

    c.save()

    # Cleanup temp files
    os.remove(photo_path)
    os.remove(heatmap_path)

    return output_path
