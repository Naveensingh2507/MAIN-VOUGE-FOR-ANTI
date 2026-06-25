---
title: AI VOGUE
emoji: 👗
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
---

# 🧬 AI Vogue — Garment DNA Extraction Pipeline

A local, offline Python pipeline that extracts structured visual metadata ("Garment DNA") from garment photos using free computer vision libraries. Zero API calls — runs entirely on your machine.

---

## What It Does

Instead of sending raw image bytes to Groq (which can't see images), this pipeline:

1. **Removes the background** from the garment photo (`rembg`)
2. **Extracts dominant + secondary colors** (KMeans clustering)
3. **Detects pattern** (Solid, Stripes, Complex — via LBP + FFT)
4. **Identifies structural features** via CLIP zero-shot AI:
   - Neckline type (crew neck, v-neck, spread collar, etc.)
   - Sleeve length (sleeveless, short, three-quarter, long)
   - Garment length
5. **Classifies category** (Topwear / Bottomwear / Footwear / Outerwear)
6. **Calculates formality index** (1–10) and **style archetype**
7. **Generates a text summary** — this is what Groq reads

---

## Setup (One-Time)

### Prerequisites
- Python 3.10 or higher
- pip

### Install

**macOS / Linux:**
```bash
cd scripts/
bash setup.sh
```

**Windows (PowerShell):**
```powershell
cd scripts
pip install -r requirements.txt
python -c "from transformers import CLIPProcessor, CLIPModel; CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')"
```

> ⚠️ First run downloads the CLIP model (~350MB). This is cached and never re-downloaded.

---

## Usage

### Single Image
```bash
python extract_garment_dna.py --image my_shirt.jpg
```

**Output:**
- `my_shirt_clean.png` — background-removed version of the garment
- `my_shirt_dna.json` — the full Garment DNA object

**Specify output path:**
```bash
python extract_garment_dna.py --image my_shirt.jpg --output /wardrobe/shirt_dna.json
```

### Batch Processing (Whole Folder)
```bash
python batch_process.py --input ./wardrobe_photos/ --output ./dna_output/
```

**Resume a batch (skip already-processed images):**
```bash
python batch_process.py --input ./wardrobe_photos/ --output ./dna_output/ --resume
```

**Parallel processing (use with caution — CLIP is memory-heavy):**
```bash
python batch_process.py --input ./photos/ --output ./output/ --workers 2
```

### Import as Python Module
```python
from extract_garment_dna import extract_dna

dna = extract_dna("my_blazer.jpg")
print(dna["final_summary"])
# → "Solid black blazer with spread collar (Formal, formality 9/10)"
```

---

## Output Format (Garment DNA Schema)

```json
{
  "item_id": "auto_generated_uuid",
  "category": "Topwear",
  "visual_traits": {
    "dominant_color_hex": "#1B2A6B",
    "dominant_color_name": "Navy Blue",
    "secondary_color_hex": "#FFFFFF",
    "secondary_color_name": "White",
    "pattern": "Vertical Stripes",
    "pattern_confidence": 0.87
  },
  "physical_traits": {
    "material": null,
    "fit": null,
    "sleeve_length": "Long Sleeve",
    "garment_length": "Standard Length Top",
    "neckline": "Spread Collar",
    "season": "All-Season"
  },
  "style_traits": {
    "formality_index": 7,
    "style_archetype": "Business Casual"
  },
  "user_overrides": {
    "material": null,
    "fit": null,
    "formality_index": null
  },
  "final_summary": "Long-sleeve navy blue and white vertical stripes topwear with spread collar (Business Casual, formality 7/10)"
}
```

> **`material` and `fit` are always null** from the script — the user fills these in through the app's Asset Editor UI.

---

## Integrating with the React App

### 1. Run the Script on Upload
After a user uploads a garment image, run the script on your machine before uploading to Supabase.

### 2. Store DNA in Supabase
Add a `garment_dna` JSONB column to your `garments` table, then store the full DNA object there.

### 3. Use the Clean Image
Upload `{name}_clean.png` to Supabase Storage as the garment's display image (no background = cleaner UI).

### 4. Send DNA to Groq
In `netlify/functions/stylist.ts`, the `garment_dna` field is already formatted into a rich text block for Groq:
```
GARMENT PROFILE (Extracted Visual DNA):
- Category: Topwear
- Colors: Navy Blue with White
- Pattern: Vertical Stripes
- Neckline: Spread Collar
- Sleeve: Long Sleeve
- Formality: 7/10
- Style: Business Casual
- Summary: Long-sleeve navy blue and white vertical stripes...
```

### 5. User Fills in `material` and `fit`
In the `AssetEditorModal`, show the DNA tags as read-only detected fields, and let the user fill in `material` (Cotton, Linen, etc.) and `fit` (Slim, Regular, Relaxed) via dropdowns. On save, merge `user_overrides` into the DNA.

---

## Expected Results

| Input Image | Expected `pattern` | Expected `category` | Expected `formality` |
|---|---|---|---|
| Navy striped button-down shirt | Vertical Stripes | Topwear | 8 |
| Plain white t-shirt | Solid | Topwear | 3 |
| Blue denim jeans | Solid | Bottomwear | 4 |
| Black blazer | Solid | Outerwear | 9 |
| White sneakers | Solid | Footwear | 2 |

---

## Troubleshooting

**Script runs slow on first execution:**
CLIP model is loading/downloading. This only happens once; subsequent runs use the local cache.

**`rembg` errors:**
Try: `pip install --upgrade rembg`

**CLIP gives unexpected results:**
Try increasing `confidence_threshold` in `_clip_classify()` from 0.3 to 0.4 for stricter detection.

**Out of memory with CLIP:**
CLIP requires ~1.5GB RAM minimum. Close other heavy applications and try again. Do not use `--workers > 1` unless you have 8GB+ RAM.
