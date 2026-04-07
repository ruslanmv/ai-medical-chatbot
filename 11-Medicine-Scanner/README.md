---
title: MedOS Medicine Scanner
emoji: 💊
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 5.25.0
python_version: 3.11
app_file: app.py
pinned: false
license: mit
---

# MedOS Medicine Scanner

AI-powered medicine label scanner that extracts structured information from
photos of medicine packaging, labels, and prescriptions.

## Features

- **Multimodal AI**: Uses Qwen2.5-VL via HuggingFace Inference API for
  intelligent label understanding
- **Structured JSON output**: Returns data compatible with MedOS "My Medicines"
- **REST API**: POST `/api/scan` for programmatic access
- **Mobile-friendly**: Supports camera capture directly from phone
- **Free**: Runs on HuggingFace Spaces with free inference

## API Usage

```bash
curl -X POST https://your-space.hf.space/api/scan \
  -F "image=@medicine_photo.jpg"
```

Response:
```json
{
  "success": true,
  "medicine": {
    "name": "Amoxicillin",
    "brandName": "Amoxil",
    "activeIngredient": "Amoxicillin Trihydrate",
    "dose": "500mg",
    "form": "capsule",
    "category": "Antibiotic",
    "quantity": 1,
    "expiryDate": "2027-03",
    "notes": "Take 1 capsule 3 times daily with food"
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` | No | HuggingFace token for higher rate limits |
| `MODEL_ID` | No | Override default model (default: `Qwen/Qwen2.5-VL-3B-Instruct`) |
