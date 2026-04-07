"""
MedOS Medicine Scanner — HuggingFace Space (Gradio SDK)

Scan medicine labels with AI (Qwen2.5-VL) and return structured JSON.
Uses HF Spaces native Gradio SDK — no Docker needed.
"""

import json
import logging
import os
import io
import time

import gradio as gr
import numpy as np
from PIL import Image

from scanner import scan_medicine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def scan_image_ui(image_dict, hf_token: str) -> tuple[str, str]:
    """Gradio interface handler."""
    if image_dict is None:
        return "Please upload or capture a medicine image.", "{}"

    start = time.time()

    # gr.Image returns filepath string or numpy array depending on type
    if isinstance(image_dict, str):
        pil_image = Image.open(image_dict)
    elif isinstance(image_dict, np.ndarray):
        pil_image = Image.fromarray(image_dict)
    else:
        pil_image = Image.fromarray(np.asarray(image_dict))

    result = scan_medicine(pil_image, hf_token=(hf_token or "").strip())
    elapsed = time.time() - start

    if not result["success"]:
        err = f"Scan failed: {result['error']}"
        return err, json.dumps(result, indent=2)

    med = result["medicine"]
    model_short = (result.get("model_used") or "unknown").split("/")[-1]

    lines = [f"Medicine: {med['name']}"]
    if med.get("brandName"):
        lines.append(f"Brand: {med['brandName']}")
    lines.append(f"Dose: {med['dose']}")
    lines.append(f"Form: {med['form'].capitalize()}")
    if med.get("activeIngredient"):
        lines.append(f"Active ingredient: {med['activeIngredient']}")
    if med.get("category"):
        lines.append(f"Category: {med['category']}")
    if med.get("expiryDate"):
        lines.append(f"Expiry: {med['expiryDate']}")
    if med.get("notes"):
        lines.append(f"Instructions: {med['notes']}")
    lines.append(f"\nScanned in {elapsed:.1f}s using {model_short}")

    summary = "\n".join(lines)
    api_json = json.dumps(
        {"success": True, "medicine": med, "model_used": result.get("model_used"),
         "scan_time_ms": int(elapsed * 1000)},
        indent=2, ensure_ascii=False,
    )
    return summary, api_json


# ============================================================
# Gradio Interface
# ============================================================

EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "examples")

example_images = []
if os.path.isdir(EXAMPLES_DIR):
    for fname in sorted(os.listdir(EXAMPLES_DIR)):
        if fname.lower().endswith((".jpg", ".jpeg", ".png")):
            example_images.append([os.path.join(EXAMPLES_DIR, fname), ""])

demo = gr.Interface(
    fn=scan_image_ui,
    inputs=[
        gr.Image(label="Medicine Image", type="filepath"),
        gr.Textbox(
            label="HuggingFace Token (optional — auto-provided when used from MedOS)",
            placeholder="hf_... — only needed for standalone use",
            type="password",
        ),
    ],
    outputs=[
        gr.Textbox(label="Extracted Information", lines=10),
        gr.Textbox(label="API Response (JSON)", lines=12),
    ],
    examples=example_images if example_images else None,
    cache_examples=False,
    title="MedOS Medicine Scanner",
    description=(
        "Scan medicine packages, labels, or prescriptions with your camera. "
        "The AI extracts drug name, dosage, form, expiry date, and instructions automatically.\n\n"
        "**From MedOS:** Token is provided automatically — just scan.\n"
        "**Standalone:** Enter a free [HuggingFace token](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) "
        "with *'Make calls to Inference Providers'* permission."
    ),
    article=(
        "**Privacy:** Images are processed via HuggingFace Inference API and are not stored.\n\n"
        "**Disclaimer:** For informational purposes only. Always verify with a pharmacist."
    ),
    flagging_mode="never",
)

if __name__ == "__main__":
    demo.launch()
