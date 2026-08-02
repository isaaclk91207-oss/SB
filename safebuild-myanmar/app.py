import streamlit as st
from PIL import Image
import os
from utils.translations import get_text
from utils.predict import predict, load_model
from utils.heatmap import generate_heatmap
from utils.report import generate_report

# Page config
st.set_page_config(
    page_title="Safe AI (SafeBuild Myanmar)",
    page_icon="🏗️",
    layout="centered",
)

# Session state init
if "lang" not in st.session_state:
    st.session_state.lang = "en"

# --- Sidebar: Language selector ---
st.sidebar.markdown(f"### {get_text(st.session_state.lang, 'language_label')}")
lang = st.sidebar.radio("", ["English", "မြန်မာ"], label_visibility="collapsed")
st.session_state.lang = "en" if lang == "English" else "my"
lang = st.session_state.lang

# --- Header ---
st.title(get_text(lang, "app_title"))
st.subheader(get_text(lang, "app_subtitle"))

# --- Boundary Notice ---
st.info(get_text(lang, "boundary_notice"))

# --- Check model exists ---
model_path = os.path.join("models", "safebuild_resnet18.pth")
if not os.path.exists(model_path):
    st.error(get_text(lang, "error_model_missing"))
    st.stop()

# --- File uploader ---
uploaded = st.file_uploader(
    get_text(lang, "upload_label"),
    type=["jpg", "jpeg", "png"],
    help=get_text(lang, "upload_help"),
)

if uploaded is not None:
    # Load and display image
    image = Image.open(uploaded)

    # Validate image size
    if image.size[0] < 50 or image.size[1] < 50:
        st.warning(get_text(lang, "warning_low_quality"))

    # Check if likely non-building (extreme aspect ratio)
    w, h = image.size
    if w / h > 2 or h / w > 2:
        st.warning(get_text(lang, "warning_low_quality"))

    st.image(image, caption=uploaded.name, use_container_width=True)

    # Run inference
    with st.spinner(get_text(lang, "analyzing")):
        try:
            pred_class, confidence, class_names = predict(image)
            heatmap = generate_heatmap(image)
        except Exception as e:
            st.error(f"{get_text(lang, 'error_model_load')}: {str(e)}")
            st.stop()

    st.divider()

    # --- Result Section ---
    st.subheader(get_text(lang, "result_title"))

    # Priority with color
    colors = {"low": "green", "medium": "orange", "high": "red"}
    color = colors.get(pred_class, "gray")

    # Main result: Priority label
    st.markdown(f"**{get_text(lang, 'priority_label')}:** :{color}[{get_text(lang, f'priority_{pred_class}')}]")

    # Priority description
    desc_key = f"priority_{pred_class}_desc"
    st.markdown(f"*{get_text(lang, desc_key)}*")

    # Confidence
    st.markdown(f"**{get_text(lang, 'confidence_label')}:** {confidence:.1%}")

    # Action Guidance
    st.markdown(f"**{get_text(lang, 'action_label')}:**")
    st.info(get_text(lang, f"action_{pred_class}"))

    # Note (caveat)
    st.warning(f"**{get_text(lang, 'caveat_label')}:** {get_text(lang, 'caveat')}")

    # Evidence section
    st.subheader(get_text(lang, "evidence_label"))
    col_photo, col_heatmap = st.columns(2)
    with col_photo:
        st.image(image, caption=get_text(lang, "pdf_photo"), use_container_width=True)
    with col_heatmap:
        st.image(heatmap, caption="Grad-CAM", use_container_width=True)

    # PDF download
    pdf_path = "temp_report.pdf"
    generate_report(pdf_path, image, heatmap, pred_class, confidence, lang)
    with open(pdf_path, "rb") as f:
        st.download_button(
            label=get_text(lang, "download_pdf"),
            data=f.read(),
            file_name="safebuild_report.pdf",
            mime="application/pdf",
        )
    os.remove(pdf_path)

# --- Footer ---
st.divider()
st.caption(get_text(lang, "footer"))

