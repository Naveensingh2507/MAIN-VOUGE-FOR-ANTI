# 🧠 AI Vogue — Garment DNA Extraction Pipeline: Master Implementation Prompt

> **How to use this:** Paste this entire document as your FIRST message in any new AI chat (Cursor, Claude, ChatGPT, Gemini, Groq). Then ask your specific coding question below it. This gives the AI full context of your architecture and the exact task.

---

## PART 1: PROJECT CONTEXT (Read Before Writing Any Code)

**Role:** You are an expert Full-Stack Software Engineer and Python AI/ML Specialist helping build the "AI Vogue" app. Read this entire document before suggesting any code.

### App Overview
- **App Name:** AI Vogue (`ai-vogue-vite` subfolder in the repo)
- **Purpose:** AI-powered wardrobe management and outfit matchmaking
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Radix UI / shadcn/ui
- **Routing:** React Router DOM (`/`, `/style`, `/matchability`, `/profile`)
- **Backend:** Netlify Functions (serverless) — file: `netlify/functions/stylist.ts`
- **Database:** Supabase
- **AI Engine:** Groq API (text-only, NO image input support) — this is the critical constraint

### The Core Problem This Prompt Solves
**Groq cannot see images.** The current app uploads garment photos but Groq has no visual context to work with. This means outfit suggestions, synergy scoring, and matchmaking are all working blind.

**The Solution:** Build a local Python pipeline that runs BEFORE the image goes to Supabase. It extracts a structured "Garment DNA" JSON from the photo using computer vision libraries (free, no API calls). This DNA is then stored alongside the image in Supabase and sent to Groq as rich text metadata — giving Groq a perfect "mental blueprint" of every garment without ever needing to see a pixel.

### The Garment DNA Schema (Target Output)
Every garment must produce this JSON object. This is the source of truth stored in Supabase and sent to Groq:

```json
{
  "item_id": "auto_generated_uuid",
  "category": "Shirt",
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
    "sleeve_length": "Long",
    "garment_length": "Standard",
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
  "final_summary": "Long-sleeve slim-fit navy and white striped shirt with spread collar. Business casual."
}
```

**Note on `null` fields:** `material` and `fit` are always null from the script — these are filled by the user in the `AssetEditorModal` UI. The script handles everything it can visually detect.

---

## PART 2: THE TASK — Build the Python Garment DNA Extraction Pipeline

### File to Create
Create a single Python script: `scripts/extract_garment_dna.py`

This script must be runnable as:
```bash
python extract_garment_dna.py --image path/to/garment.jpg --output dna.json
```

It must also be importable as a module (for future Netlify Function or FastAPI integration):
```python
from extract_garment_dna import extract_dna
result = extract_dna("path/to/image.jpg")
# returns the Garment DNA dict
```

---

## PART 3: THE PIPELINE — Step-by-Step Architecture

Build the script as a sequential pipeline of these stages:

### Stage 1: Background Removal
- Use `rembg` library to isolate the garment on a transparent/white background
- This is critical — without it, background colors corrupt all downstream analysis
- Output: a clean PIL Image object (RGBA) for use in all subsequent stages
- Save the clean image to `{original_name}_clean.png` alongside the output JSON

### Stage 2: Color Extraction
- Convert the cleaned image (ignoring transparent pixels) to RGB pixel array
- Use `scikit-learn` KMeans clustering with `k=5` clusters
- Identify the **dominant color** (largest cluster) and **secondary color** (second largest)
- Ignore clusters where the color is near-white (#F5F5F5+) or near-transparent — these are background artifacts
- Convert the RGB cluster centroid to:
  - Hex string (e.g., `#1B2A6B`)
  - Human-readable color name using `webcolors` library (closest named color)
- Store both dominant and secondary color in the DNA

### Stage 3: Pattern Detection
Use a hybrid approach combining two methods:

**Method A — Local Binary Patterns (LBP) via `scikit-image`:**
- Convert the clean image to grayscale
- Compute LBP texture features using `skimage.feature.local_binary_pattern` with `P=24, R=3, method='uniform'`
- Compute the normalized histogram of LBP codes
- Use this histogram as a feature vector for classification

**Method B — Frequency Domain Analysis (FFT):**
- Apply 2D Fast Fourier Transform to the grayscale image
- Check for dominant directional frequencies — horizontal periodicity = horizontal stripes, vertical periodicity = vertical stripes
- Use this as a secondary signal to confirm stripe detection

**Pattern Classification Rules (implement as logic, not ML model):**
```
IF FFT shows strong vertical periodicity AND LBP variance is high:
  → "Vertical Stripes"
IF FFT shows strong horizontal periodicity AND LBP variance is high:
  → "Horizontal Stripes"
IF LBP histogram shows very low variance (uniform texture):
  → "Solid"
IF LBP histogram shows high entropy across many codes:
  → "Complex Pattern" (plaid, floral, etc.)
ELSE:
  → "Solid" (default fallback)
```

Include a `pattern_confidence` score (0.0–1.0) based on how strong the FFT signal was.

### Stage 4: Structural Feature Detection (Neckline, Sleeve, Length)
Use a **pre-trained CLIP model** (`openai/clip-vit-base-patch32` via HuggingFace `transformers` library):
- Run zero-shot classification against candidate label lists
- Do NOT train anything — just use CLIP's existing knowledge

**Neckline detection** — classify against these candidates:
```python
neckline_candidates = [
  "crew neck", "v-neck", "button-down collar", "spread collar",
  "turtleneck", "polo collar", "hooded", "off-shoulder"
]
```

**Sleeve length detection** — classify against:
```python
sleeve_candidates = [
  "sleeveless", "short sleeve", "three-quarter sleeve", "long sleeve"
]
```

**Garment length detection** — classify against:
```python
length_candidates = [
  "crop top", "standard length top", "longline top",
  "shorts", "knee-length pants", "full-length pants", "midi skirt", "maxi skirt"
]
```

Take the top-1 result for each. If confidence < 0.3, return `null` for that field.

### Stage 5: Category Detection
Use CLIP zero-shot classification against:
```python
category_candidates = [
  "t-shirt", "button-down shirt", "hoodie", "sweater", "jacket", "blazer",
  "dress", "skirt", "jeans", "trousers", "shorts", "shoes", "sneakers",
  "boots", "sandals", "coat", "activewear top", "activewear bottom"
]
```

Map the result to your app's 4 categories: `Topwear`, `Bottomwear`, `Footwear`, `Outerwear`

### Stage 6: Formality Index Inference
Use rule-based logic (no ML needed) based on the detected attributes:

```python
def infer_formality(category, neckline, pattern, material_hint=None):
    score = 5  # neutral default
    
    # Category adjustments
    if category in ["blazer", "trousers"]: score += 2
    if category in ["t-shirt", "shorts", "sneakers"]: score -= 2
    if category in ["hoodie", "activewear"]: score -= 3
    
    # Neckline adjustments
    if neckline in ["spread collar", "button-down collar"]: score += 2
    if neckline in ["crew neck", "v-neck"]: score += 0
    if neckline == "hooded": score -= 2
    
    # Pattern adjustments
    if pattern == "Solid": score += 1
    if pattern in ["Vertical Stripes"]: score += 1
    
    return max(1, min(10, score))  # clamp to 1–10
```

### Stage 7: Style Archetype Classification
Map formality index + category to a style archetype:

```python
def infer_archetype(formality, category):
    if formality >= 8: return "Formal"
    if formality >= 6: return "Business Casual"
    if formality >= 4: return "Smart Casual"
    if category in ["hoodie", "activewear", "sneakers"]: return "Streetwear"
    return "Casual"
```

### Stage 8: Build Final Summary String
Construct a human-readable summary that gets sent as text to Groq:

```python
def build_summary(dna):
    parts = []
    if dna["physical_traits"]["sleeve_length"]:
        parts.append(dna["physical_traits"]["sleeve_length"].lower() + "-sleeve")
    if dna["physical_traits"]["fit"]:
        parts.append(dna["physical_traits"]["fit"].lower())
    
    color_str = dna["visual_traits"]["dominant_color_name"]
    if dna["visual_traits"]["secondary_color_name"]:
        color_str += f" and {dna['visual_traits']['secondary_color_name']}"
    
    pattern_str = dna["visual_traits"]["pattern"].lower()
    parts.append(f"{color_str} {pattern_str}")
    parts.append(dna["category"].lower())
    
    if dna["physical_traits"]["neckline"]:
        parts.append(f"with {dna['physical_traits']['neckline'].lower()}")
    
    parts.append(f"({dna['style_traits']['style_archetype']}, formality {dna['style_traits']['formality_index']}/10)")
    
    return " ".join(parts).capitalize()
```

---

## PART 4: INTEGRATION WITH THE REACT APP

### What the Python Script Produces
For each garment image processed, the script outputs:
1. `{name}_clean.png` — background-removed image for display in the UI
2. `{name}_dna.json` — the full Garment DNA object

### How This Plugs Into the Existing Architecture

**In Supabase:** Add a `garment_dna` JSONB column to the garments table. Store the full DNA object there alongside the image URL.

**In `netlify/functions/stylist.ts`:** When building prompts for Groq, pull the `garment_dna` from Supabase and format it like this:

```typescript
// In your detect_garment or suggest_outfit handler:
const garmentContext = `
GARMENT PROFILE (Extracted Visual DNA):
- Category: ${dna.category}
- Colors: ${dna.visual_traits.dominant_color_name} with ${dna.visual_traits.secondary_color_name}
- Pattern: ${dna.visual_traits.pattern}
- Neckline: ${dna.physical_traits.neckline}
- Sleeve: ${dna.physical_traits.sleeve_length}
- Material: ${dna.user_overrides.material || "Unknown"}
- Fit: ${dna.user_overrides.fit || "Unknown"}
- Formality: ${dna.style_traits.formality_index}/10
- Style: ${dna.style_traits.style_archetype}
- Summary: ${dna.final_summary}
`;
```

**In `AssetEditorModal` (React):** After uploading a garment:
1. Display the `_clean.png` version as the garment preview
2. Pre-fill the color pickers with `dominant_color_hex` and `secondary_color_hex`
3. Show the `pattern`, `neckline`, `sleeve_length` as read-only detected tags
4. Show dropdowns for `material` and `fit` (user must fill these — AI can't detect them reliably from images)
5. On save, merge `user_overrides` into the DNA before storing in Supabase

**In `AppState.tsx`:** Update the `Garment` type to include the `garment_dna` field:
```typescript
interface Garment {
  id: string;
  image_url: string;
  clean_image_url: string;
  category: "Topwear" | "Bottomwear" | "Footwear" | "Outerwear";
  garment_dna: GarmentDNA; // add this
  created_at: string;
}
```

---

## PART 5: REQUIRED LIBRARIES & SETUP

Create `scripts/requirements.txt`:
```
rembg==2.0.57
Pillow==10.3.0
scikit-learn==1.4.2
scikit-image==0.22.0
numpy==1.26.4
webcolors==1.13
transformers==4.40.2
torch==2.3.0
open-clip-torch==2.24.0
scipy==1.13.0
```

Create `scripts/setup.sh`:
```bash
#!/bin/bash
echo "Setting up AI Vogue Garment DNA Extraction Pipeline..."
pip install -r requirements.txt
echo "Downloading CLIP model (one-time, ~350MB)..."
python -c "from transformers import CLIPProcessor, CLIPModel; CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')"
echo "Setup complete. Run: python extract_garment_dna.py --image YOUR_IMAGE.jpg"
```

---

## PART 6: CONSTRAINTS & RULES — FOLLOW THESE STRICTLY

1. **Zero API calls** — The entire pipeline runs locally. No Gemini, no Groq, no cloud vision APIs are used in the Python script.
2. **No hardcoded paths** — Use `argparse` for CLI and accept relative/absolute paths.
3. **Graceful degradation** — If CLIP fails to detect a feature with confidence > 0.3, return `null` for that field rather than guessing.
4. **No new React state variables** — The only frontend change is adding `garment_dna` to the existing `Garment` type and reading it in `AssetEditorModal`.
5. **No new Netlify Functions** — The `garment_dna` is just additional data passed to the existing `stylist.ts` function.
6. **The script is offline-first** — It must work without internet after the one-time model download.
7. **Keep the `scripts/` folder separate** — Do not modify any file inside `ai-vogue-vite/src/` except for type definitions and the `AssetEditorModal`.

---

## PART 7: TEST CASES TO VERIFY THE PIPELINE WORKS

After writing the script, verify it against these scenarios:

| Input Image | Expected `pattern` | Expected `category` | Expected `formality` |
|---|---|---|---|
| Navy striped button-down shirt | Vertical Stripes | Topwear | 8 |
| Plain white t-shirt | Solid | Topwear | 3 |
| Blue denim jeans | Solid | Bottomwear | 4 |
| Black blazer | Solid | Outerwear | 9 |
| White sneakers | Solid | Footwear | 2 |

---

## PART 8: DELIVERABLES CHECKLIST

When you are done, I should have:

- [ ] `scripts/extract_garment_dna.py` — the full pipeline script
- [ ] `scripts/requirements.txt` — all Python dependencies pinned
- [ ] `scripts/setup.sh` — one-command setup script
- [ ] `scripts/README.md` — how to run it, how to integrate it with the React app
- [ ] (Optional) `scripts/batch_process.py` — to run the pipeline on a whole folder of images at once
- [ ] TypeScript type update for `GarmentDNA` interface (for `AppState.tsx`)
- [ ] Updated Groq prompt template for `stylist.ts` that uses the DNA fields

---

*End of prompt. Now write the complete implementation.*
