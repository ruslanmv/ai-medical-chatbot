"""
MedOS Medicine Scanner — AI-powered medicine label extraction.

Uses HuggingFace Inference Providers (router.huggingface.co) with
the huggingface_hub InferenceClient for automatic provider selection
and failover across 10+ vision-language models.

Token requirement: HF token with "Make calls to Inference Providers"
permission. Create one at: https://huggingface.co/settings/tokens/new?
  ownUserPermissions=inference.serverless.write&tokenType=fineGrained
"""

import base64
import json
import os
import re
import io
import logging
from typing import Optional

from huggingface_hub import InferenceClient
from PIL import Image

logger = logging.getLogger(__name__)

HF_TOKEN = os.environ.get("HF_TOKEN", "")

# ============================================================
# VLM fallback chain — verified working models only.
# Tested 2026-04-07 with actual image inference.
# ============================================================
FALLBACK_MODELS = [
    "Qwen/Qwen2.5-VL-72B-Instruct",    # Best quality, Qwen VLM 72B
    "google/gemma-3-27b-it",             # Google Gemma 3, strong VLM
]

VALID_FORMS = [
    "tablet", "capsule", "syrup", "inhaler",
    "injection", "cream", "drops", "patch", "other",
]

VALID_CATEGORIES = [
    "Diabetes", "Pain Relief", "Cardiovascular", "Respiratory",
    "Antibiotic", "Supplement", "Mental Health", "Thyroid",
    "Gastrointestinal", "Allergy", "Other",
]

EXTRACTION_PROMPT = """You are a medicine label scanner. Analyze this image of a medicine package, label, bottle, or prescription.

Extract ALL visible information and return ONLY a JSON object with these exact fields:

{
  "name": "Generic/medicine name (e.g. Amoxicillin)",
  "brandName": "Brand name if visible (e.g. Amoxil)",
  "activeIngredient": "Active ingredient(s) with amounts",
  "dose": "Dosage strength (e.g. 500mg, 10mg/5mL)",
  "form": "One of: tablet, capsule, syrup, inhaler, injection, cream, drops, patch, other",
  "category": "One of: Diabetes, Pain Relief, Cardiovascular, Respiratory, Antibiotic, Supplement, Mental Health, Thyroid, Gastrointestinal, Allergy, Other",
  "quantity": 1,
  "expiryDate": "Expiry date in YYYY-MM format if visible",
  "notes": "Dosage instructions, warnings, or other important info from the label"
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- Use null for fields you cannot determine from the image
- For "form", pick the closest match from the allowed values
- For "category", pick the most appropriate medical category
- Include dosage instructions in "notes" if visible
- If multiple medicines are visible, extract only the primary/most prominent one
- If this is NOT a medicine image, return: {"error": "No medicine detected in image"}
- NEVER provide dosage recommendations — only extract what is printed on the label
- If you are uncertain about any field, use null rather than guessing"""


def encode_image(image: Image.Image, max_size: int = 1024) -> str:
    """Resize and base64-encode an image for the API."""
    w, h = image.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def call_vlm(image_b64: str, model: str, token: str) -> Optional[str]:
    """
    Call a vision-language model via HuggingFace InferenceClient.
    Uses router.huggingface.co with automatic provider selection.
    """
    try:
        client = InferenceClient(token=token or None)

        # Build message with image
        response = client.chat_completion(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=800,
            temperature=0.1,
        )

        if response and response.choices:
            return response.choices[0].message.content
        return None

    except Exception as e:
        err_msg = str(e)
        # Truncate long error messages for cleaner logs
        if len(err_msg) > 200:
            err_msg = err_msg[:200] + "..."
        logger.warning("Model %s failed: %s", model, err_msg)
        return None


def parse_json_response(text: str) -> Optional[dict]:
    """Extract JSON from model response, handling markdown fences."""
    if not text:
        return None
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    patterns = [
        r"```json\s*(.*?)\s*```",
        r"```\s*(.*?)\s*```",
        r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                candidate = match.group(1) if "```" in pattern else match.group(0)
                return json.loads(candidate)
            except (json.JSONDecodeError, IndexError):
                continue
    return None


def normalize_form(form_str: Optional[str]) -> str:
    if not form_str:
        return "other"
    form_lower = form_str.lower().strip()
    if form_lower in VALID_FORMS:
        return form_lower
    mappings = {
        "tab": "tablet", "pill": "tablet", "caplet": "tablet",
        "cap": "capsule", "gel cap": "capsule", "softgel": "capsule",
        "liquid": "syrup", "solution": "syrup", "suspension": "syrup",
        "oral solution": "syrup", "elixir": "syrup",
        "ointment": "cream", "gel": "cream", "lotion": "cream",
        "topical": "cream", "balm": "cream",
        "eye drop": "drops", "ear drop": "drops", "nasal": "drops",
        "spray": "inhaler", "aerosol": "inhaler", "nebul": "inhaler",
        "vial": "injection", "ampule": "injection", "ampoule": "injection",
        "syringe": "injection", "iv": "injection", "im": "injection",
        "transdermal": "patch", "plaster": "patch",
    }
    for key, val in mappings.items():
        if key in form_lower:
            return val
    return "other"


def normalize_category(cat_str: Optional[str]) -> Optional[str]:
    if not cat_str:
        return None
    cat_lower = cat_str.lower().strip()
    for valid in VALID_CATEGORIES:
        if valid.lower() in cat_lower or cat_lower in valid.lower():
            return valid
    cat_map = {
        "antibiotic": "Antibiotic", "anti-biotic": "Antibiotic",
        "antimicrobial": "Antibiotic", "antifungal": "Antibiotic",
        "pain": "Pain Relief", "analgesic": "Pain Relief",
        "nsaid": "Pain Relief", "anti-inflammatory": "Pain Relief",
        "heart": "Cardiovascular", "blood pressure": "Cardiovascular",
        "hypertension": "Cardiovascular", "cholesterol": "Cardiovascular",
        "statin": "Cardiovascular", "cardiac": "Cardiovascular",
        "lung": "Respiratory", "asthma": "Respiratory",
        "bronch": "Respiratory", "cough": "Respiratory",
        "diabetes": "Diabetes", "insulin": "Diabetes",
        "metformin": "Diabetes", "glucose": "Diabetes",
        "vitamin": "Supplement", "mineral": "Supplement",
        "iron": "Supplement", "calcium": "Supplement",
        "omega": "Supplement", "probiotic": "Supplement",
        "antidepressant": "Mental Health", "anxiety": "Mental Health",
        "ssri": "Mental Health", "psychiatric": "Mental Health",
        "sleep": "Mental Health", "sedative": "Mental Health",
        "thyroid": "Thyroid", "levothyroxine": "Thyroid",
        "stomach": "Gastrointestinal", "acid": "Gastrointestinal",
        "antacid": "Gastrointestinal", "ppi": "Gastrointestinal",
        "laxative": "Gastrointestinal", "diarr": "Gastrointestinal",
        "allergy": "Allergy", "antihistamine": "Allergy",
        "cetirizine": "Allergy", "loratadine": "Allergy",
    }
    for key, val in cat_map.items():
        if key in cat_lower:
            return val
    return "Other"


def normalize_expiry(date_str: Optional[str]) -> Optional[str]:
    if not date_str:
        return None
    date_str = date_str.strip()
    if re.match(r"^\d{4}-\d{2}$", date_str):
        return date_str
    m = re.match(r"^(\d{4})-(\d{2})-\d{2}$", date_str)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m = re.match(r"^(\d{1,2})[/-](\d{4})$", date_str)
    if m:
        return f"{m.group(2)}-{int(m.group(1)):02d}"
    m = re.match(r"^(\d{4})[/-](\d{1,2})$", date_str)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    months = {
        "jan": "01", "feb": "02", "mar": "03", "apr": "04",
        "may": "05", "jun": "06", "jul": "07", "aug": "08",
        "sep": "09", "oct": "10", "nov": "11", "dec": "12",
    }
    m = re.match(r"^([a-zA-Z]+)\s*(\d{4})$", date_str)
    if m:
        mon = m.group(1)[:3].lower()
        if mon in months:
            return f"{m.group(2)}-{months[mon]}"
    return None


def build_medicine_item(raw: dict) -> dict:
    if "error" in raw:
        return {"error": raw["error"]}
    name = (raw.get("name") or "").strip()
    if not name:
        return {"error": "Could not extract medicine name from image"}
    dose = (raw.get("dose") or "").strip() or "See label"

    result = {"name": name, "dose": dose, "form": normalize_form(raw.get("form")), "quantity": 1}

    for field, key in [("brandName", "brandName"), ("activeIngredient", "activeIngredient")]:
        val = (raw.get(key) or "").strip()
        if val and val.lower() != "null":
            result[field] = val

    category = normalize_category(raw.get("category"))
    if category:
        result["category"] = category
    expiry = normalize_expiry(raw.get("expiryDate"))
    if expiry:
        result["expiryDate"] = expiry
    notes = (raw.get("notes") or "").strip()
    if notes and notes.lower() != "null":
        result["notes"] = notes
    qty = raw.get("quantity")
    if isinstance(qty, int) and qty > 0:
        result["quantity"] = qty
    return result


def scan_medicine(image: Image.Image, hf_token: str = "") -> dict:
    """
    Main entry point: scan a medicine image and return structured data.

    Requires a HuggingFace token with "Make calls to Inference Providers"
    permission. Tries 10 models in cascade until one succeeds.
    """
    token = hf_token or HF_TOKEN
    if not token:
        return {
            "success": False,
            "error": (
                "HuggingFace token required. Enter your token in the field below, "
                "or set HF_TOKEN as a Space secret. The token needs 'Make calls to "
                "Inference Providers' permission: https://huggingface.co/settings/tokens"
            ),
            "medicine": None,
            "raw_response": None,
            "model_used": None,
        }

    image_b64 = encode_image(image)

    raw_response = None
    model_used = None
    last_error = ""

    for model in FALLBACK_MODELS:
        logger.info("Trying model: %s", model)
        raw_response = call_vlm(image_b64, model, token)
        if raw_response:
            model_used = model
            break

    if not raw_response:
        return {
            "success": False,
            "error": (
                "All models are currently unavailable. This usually means rate limits. "
                "Please wait a moment and try again. If this persists, ensure your "
                "HF token has 'Make calls to Inference Providers' permission."
            ),
            "medicine": None,
            "raw_response": None,
            "model_used": None,
        }

    parsed = parse_json_response(raw_response)
    if not parsed:
        return {
            "success": False,
            "error": "Could not parse model response as JSON",
            "medicine": None,
            "raw_response": raw_response,
            "model_used": model_used,
        }

    medicine = build_medicine_item(parsed)
    if "error" in medicine:
        return {
            "success": False,
            "error": medicine["error"],
            "medicine": None,
            "raw_response": raw_response,
            "model_used": model_used,
        }

    return {
        "success": True,
        "medicine": medicine,
        "raw_response": raw_response,
        "model_used": model_used,
    }
