"""
AI Vogue — Garment DNA Extraction Pipeline
==========================================
Extracts structured visual metadata ("Garment DNA") from a garment photo
using only local computer vision libraries (zero API calls).

Usage (CLI):
    python extract_garment_dna.py --image path/to/garment.jpg --output dna.json

Usage (as module):
    from extract_garment_dna import extract_dna
    result = extract_dna("path/to/image.jpg")
    # returns the Garment DNA dict

Requirements:
    pip install -r requirements.txt
    # First run will download CLIP model (~350MB, one-time only)
"""

import argparse
import json
import uuid
import warnings
from pathlib import Path

import numpy as np
from PIL import Image

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1: Background Removal
# ─────────────────────────────────────────────────────────────────────────────

def remove_background(image_path: str) -> Image.Image:
    """
    Removes the background from the garment image using rembg.
    Returns a PIL RGBA image with the garment isolated on a transparent background.
    """
    from rembg import remove

    with open(image_path, "rb") as f:
        raw = f.read()

    output = remove(raw)

    from io import BytesIO
    return Image.open(BytesIO(output)).convert("RGBA")


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2: Color Extraction
# ─────────────────────────────────────────────────────────────────────────────

def _rgb_to_hex(rgb: tuple) -> str:
    return "#{:02X}{:02X}{:02X}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def _closest_color_name(rgb: tuple) -> str:
    """Get the closest named CSS color using webcolors."""
    import webcolors

    try:
        return webcolors.rgb_to_name(tuple(int(c) for c in rgb))
    except ValueError:
        pass

    # Find the closest named color by Euclidean distance in RGB space
    min_dist = float("inf")
    closest_name = "Unknown"
    for name in webcolors.names("css3"):
        hex_val = webcolors.name_to_hex(name)
        r_c, g_c, b_c = webcolors.hex_to_rgb(hex_val)
        dist = (int(rgb[0]) - r_c) ** 2 + (int(rgb[1]) - g_c) ** 2 + (int(rgb[2]) - b_c) ** 2
        if dist < min_dist:
            min_dist = dist
            closest_name = name

    # Capitalize for readability
    return closest_name.replace("-", " ").title()


def _is_near_white_or_transparent(rgb: tuple, threshold: int = 245) -> bool:
    """Check if a color is near-white (background artifact)."""
    return all(c >= threshold for c in rgb[:3])


def extract_colors(clean_image: Image.Image) -> dict:
    """
    Stage 2: Extracts dominant and secondary colors from the cleaned garment image.
    Ignores near-white and near-transparent pixels (background artifacts).
    Uses KMeans clustering with k=5.
    """
    from sklearn.cluster import KMeans

    # Get all pixels, filtering out transparent and near-white ones
    img_array = np.array(clean_image)
    h, w, _ = img_array.shape

    pixels = img_array.reshape(-1, 4)

    # Filter: keep only pixels with alpha > 100 (not transparent) and not near-white
    opaque_mask = pixels[:, 3] > 100
    non_white_mask = ~np.all(pixels[:, :3] >= 245, axis=1)
    valid_mask = opaque_mask & non_white_mask

    valid_pixels = pixels[valid_mask, :3]  # Only RGB channels

    if len(valid_pixels) < 50:
        # Fallback: not enough visible garment pixels
        return {
            "dominant_color_hex": "#1a1a1a",
            "dominant_color_name": "Black",
            "secondary_color_hex": None,
            "secondary_color_name": None,
        }

    n_clusters = min(5, len(valid_pixels))
    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    kmeans.fit(valid_pixels)

    labels = kmeans.labels_
    centers = kmeans.cluster_centers_

    # Sort clusters by count (largest cluster = dominant color)
    counts = np.bincount(labels)
    sorted_indices = np.argsort(-counts)

    dominant_rgb = centers[sorted_indices[0]]
    dominant_hex = _rgb_to_hex(dominant_rgb)
    dominant_name = _closest_color_name(dominant_rgb)

    secondary_hex = None
    secondary_name = None
    if n_clusters >= 2:
        secondary_rgb = centers[sorted_indices[1]]
        # Only include secondary if it's visually distinct from dominant
        color_dist = np.linalg.norm(dominant_rgb - secondary_rgb)
        if color_dist > 30:  # Must be meaningfully different
            secondary_hex = _rgb_to_hex(secondary_rgb)
            secondary_name = _closest_color_name(secondary_rgb)

    return {
        "dominant_color_hex": dominant_hex,
        "dominant_color_name": dominant_name,
        "secondary_color_hex": secondary_hex,
        "secondary_color_name": secondary_name,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 3: Pattern Detection (LBP + FFT Hybrid)
# ─────────────────────────────────────────────────────────────────────────────

def detect_pattern(clean_image: Image.Image) -> dict:
    """
    Stage 3: Detects the garment's visual pattern using a hybrid of:
    - Local Binary Patterns (LBP) via scikit-image for texture analysis
    - Fast Fourier Transform (FFT) for directional stripe detection
    Returns pattern name and confidence score (0.0-1.0).
    """
    from skimage.feature import local_binary_pattern
    from scipy.ndimage import zoom

    # Convert to grayscale, resize for consistent analysis
    gray = clean_image.convert("L")
    resampling_method = getattr(Image, "Resampling", Image).LANCZOS
    gray_arr = np.array(gray.resize((256, 256), resampling_method), dtype=np.float64)

    # ── Method A: LBP Texture Analysis ──
    lbp = local_binary_pattern(gray_arr, P=24, R=3, method="uniform")
    n_bins = 26  # P+2 bins for uniform LBP
    hist, _ = np.histogram(lbp, bins=n_bins, range=(0, n_bins), density=True)

    lbp_variance = float(np.var(hist))
    # Entropy as a measure of pattern complexity
    eps = 1e-10
    lbp_entropy = float(-np.sum(hist * np.log(hist + eps)))

    # ── Method B: FFT Directional Analysis ──
    fft = np.fft.fft2(gray_arr)
    fft_shift = np.fft.fftshift(fft)
    magnitude = np.abs(fft_shift)

    # Remove DC component (center)
    center = magnitude.shape[0] // 2
    magnitude[center - 5:center + 5, center - 5:center + 5] = 0

    # Check for vertical stripes: strong horizontal frequencies (columns in magnitude)
    h_strip = magnitude[center - 20:center + 20, :]
    v_strip = magnitude[:, center - 20:center + 20]

    h_energy = float(np.sum(h_strip))
    v_energy = float(np.sum(v_strip))
    total_energy = h_energy + v_energy + 1e-10

    horizontal_ratio = h_energy / total_energy
    vertical_ratio = v_energy / total_energy

    fft_stripe_strength = abs(horizontal_ratio - vertical_ratio)
    fft_confidence = min(1.0, fft_stripe_strength * 3.0)

    # ── Classification Logic ──
    if fft_stripe_strength > 0.25 and lbp_variance > 0.0005:
        if horizontal_ratio > vertical_ratio:
            # Strong horizontal periodicity in magnitude → vertical stripes in image
            pattern = "Vertical Stripes"
        else:
            # Strong vertical periodicity in magnitude → horizontal stripes in image
            pattern = "Horizontal Stripes"
        confidence = min(0.95, 0.5 + fft_stripe_strength)
    elif lbp_variance < 0.0002:
        pattern = "Solid"
        confidence = 0.85
    elif lbp_entropy > 3.5 and lbp_variance > 0.001:
        pattern = "Complex Pattern"
        confidence = 0.70
    else:
        pattern = "Solid"
        confidence = 0.75

    return {
        "pattern": pattern,
        "pattern_confidence": round(confidence, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 4 & 5: CLIP Zero-Shot Classification (Structural + Category)
# ─────────────────────────────────────────────────────────────────────────────

_clip_model = None
_clip_processor = None

def _load_clip():
    """Lazily loads the CLIP model (cached after first load)."""
    global _clip_model, _clip_processor
    if _clip_model is None:
        print("  [CLIP] Loading model (first run may take a moment)...")
        from transformers import CLIPModel, CLIPProcessor
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("  [CLIP] Model loaded.")
    return _clip_model, _clip_processor


def _clip_classify(image: Image.Image, candidates: list[str], confidence_threshold: float = 0.3) -> tuple[str | None, float]:
    """
    Runs CLIP zero-shot classification against a list of candidate labels.
    Returns (top_label, confidence) or (None, 0.0) if below threshold.
    """
    import torch

    model, processor = _load_clip()

    # CLIP works best with RGB images
    rgb_image = image.convert("RGB")

    inputs = processor(
        text=candidates,
        images=rgb_image,
        return_tensors="pt",
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits_per_image  # shape: [1, n_candidates]
        probs = logits.softmax(dim=1)[0]

    top_idx = int(probs.argmax())
    top_conf = float(probs[top_idx])

    if top_conf < confidence_threshold:
        return None, top_conf

    return candidates[top_idx], top_conf


def detect_structural_features(clean_image: Image.Image) -> dict:
    """
    Stage 4: Detects structural garment features using CLIP zero-shot classification:
    - Neckline type
    - Sleeve length
    - Garment length
    Returns null for any field with confidence < 0.3.
    """
    neckline_candidates = [
        "crew neck", "v-neck", "button-down collar", "spread collar",
        "turtleneck", "polo collar", "hooded", "off-shoulder"
    ]
    sleeve_candidates = [
        "sleeveless", "short sleeve", "three-quarter sleeve", "long sleeve"
    ]
    length_candidates = [
        "crop top", "standard length top", "longline top",
        "shorts", "knee-length pants", "full-length pants", "midi skirt", "maxi skirt"
    ]

    neckline, _ = _clip_classify(clean_image, neckline_candidates)
    sleeve_length, _ = _clip_classify(clean_image, sleeve_candidates)
    garment_length, _ = _clip_classify(clean_image, length_candidates)

    # Normalize labels to Title Case for consistency
    return {
        "neckline": neckline.title() if isinstance(neckline, str) else None,
        "sleeve_length": sleeve_length.title() if isinstance(sleeve_length, str) else None,
        "garment_length": garment_length.title() if isinstance(garment_length, str) else None,
    }


def detect_category(clean_image: Image.Image) -> str:
    """
    Stage 5: Detects the garment category using CLIP and maps it to the
    app's 4 categories: Topwear, Bottomwear, Footwear, Outerwear.
    """
    category_candidates = [
        "t-shirt", "button-down shirt", "hoodie", "sweater", "jacket", "blazer",
        "dress", "skirt", "jeans", "trousers", "shorts", "shoes", "sneakers",
        "boots", "sandals", "coat", "activewear top", "activewear bottom"
    ]

    TOPWEAR = {"t-shirt", "button-down shirt", "hoodie", "sweater", "activewear top", "dress"}
    BOTTOMWEAR = {"jeans", "trousers", "shorts", "skirt", "activewear bottom"}
    FOOTWEAR = {"shoes", "sneakers", "boots", "sandals"}
    OUTERWEAR = {"jacket", "blazer", "coat"}

    detected, _ = _clip_classify(clean_image, category_candidates, confidence_threshold=0.0)

    if not detected:
        return "Topwear"  # Safe default

    detected_lower = detected.lower()
    if detected_lower in TOPWEAR:
        return "Topwear"
    elif detected_lower in BOTTOMWEAR:
        return "Bottomwear"
    elif detected_lower in FOOTWEAR:
        return "Footwear"
    elif detected_lower in OUTERWEAR:
        return "Outerwear"
    else:
        return "Topwear"  # Default fallback


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 6 & 7: Formality Index + Style Archetype (Rule-Based)
# ─────────────────────────────────────────────────────────────────────────────

def infer_formality(category: str, neckline: str | None, pattern: str, material_hint: str | None = None) -> int:
    """
    Stage 6: Rule-based formality index from 1 (ultra casual) to 10 (black-tie formal).
    No ML — pure logic based on detected garment attributes.
    """
    score = 5  # Neutral default

    # Category adjustments
    cat_lower = category.lower()
    if cat_lower in ["outerwear"]:
        score += 1
    if "blazer" in cat_lower or "trousers" in cat_lower:
        score += 2
    if "t-shirt" in cat_lower or "shorts" in cat_lower or "footwear" in cat_lower:
        score -= 2
    if "hoodie" in cat_lower or "activewear" in cat_lower:
        score -= 3

    # Neckline adjustments
    if neckline:
        neck_lower = neckline.lower()
        if "spread collar" in neck_lower or "button-down collar" in neck_lower:
            score += 2
        if "turtleneck" in neck_lower:
            score += 1
        if "hooded" in neck_lower:
            score -= 2
        if "off-shoulder" in neck_lower:
            score -= 1

    # Pattern adjustments
    if pattern == "Solid":
        score += 1
    if pattern == "Vertical Stripes":
        score += 1
    if pattern == "Complex Pattern":
        score -= 1

    return max(1, min(10, score))


def infer_archetype(formality: int, category: str) -> str:
    """Stage 7: Maps formality index + category to a human-readable style archetype."""
    if formality >= 8:
        return "Formal"
    if formality >= 6:
        return "Business Casual"
    if formality >= 4:
        return "Smart Casual"
    if category.lower() in ["hoodie", "activewear"]:
        return "Streetwear"
    if category.lower() in ["footwear"] and formality <= 3:
        return "Casual"
    return "Casual"


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 8: Build Final Summary String
# ─────────────────────────────────────────────────────────────────────────────

def build_summary(dna: dict) -> str:
    """
    Stage 8: Constructs a human-readable summary of the garment DNA.
    This is the exact string sent to Groq as the garment's text description.
    """
    vt = dna["visual_traits"]
    pt = dna["physical_traits"]
    st = dna["style_traits"]

    parts = []

    if pt.get("sleeve_length"):
        parts.append(pt["sleeve_length"].lower() + "-sleeve")

    user_fit = (dna.get("user_overrides") or {}).get("fit")
    if user_fit:
        parts.append(user_fit.lower())

    color_str = vt["dominant_color_name"]
    if vt.get("secondary_color_name"):
        color_str += f" and {vt['secondary_color_name']}"

    pattern_str = vt["pattern"].lower()
    parts.append(f"{color_str} {pattern_str}")
    parts.append(dna["category"].lower())

    if pt.get("neckline"):
        parts.append(f"with {pt['neckline'].lower()}")

    if pt.get("garment_length") and "standard" not in pt["garment_length"].lower():
        parts.append(f"({pt['garment_length'].lower()})")

    parts.append(f"({st['style_archetype']}, formality {st['formality_index']}/10)")

    return " ".join(parts).capitalize()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

def extract_dna(image_path: str, output_path: str | None = None) -> dict:
    """
    Full 8-stage Garment DNA extraction pipeline.
    
    Args:
        image_path: Path to the input garment image (jpg, png, webp, etc.)
        output_path: Optional path to save the DNA JSON. If None, saves next to image.
    
    Returns:
        The Garment DNA dict.
    """
    image_path = str(image_path)
    p = Path(image_path)

    print(f"\n[DNA] Garment DNA Extraction Pipeline")
    print(f"   Image: {p.name}")
    print("-" * 50)

    # ── Stage 1: Background Removal ──────────────────────────────────────────
    print("  [Stage 1] Removing background...")
    clean_image = remove_background(image_path)

    # Save clean image
    clean_path = p.parent / f"{p.stem}_clean.png"
    clean_image.save(clean_path, "PNG")
    print(f"  [Stage 1] Clean image saved -> {clean_path.name}")

    # ── Stage 2: Color Extraction ─────────────────────────────────────────────
    print("  [Stage 2] Extracting colors...")
    colors = extract_colors(clean_image)
    print(f"  [Stage 2] Dominant: {colors['dominant_color_name']} ({colors['dominant_color_hex']})")
    if colors["secondary_color_hex"]:
        print(f"  [Stage 2] Secondary: {colors['secondary_color_name']} ({colors['secondary_color_hex']})")

    # ── Stage 3: Pattern Detection ────────────────────────────────────────────
    print("  [Stage 3] Detecting pattern...")
    pattern_data = detect_pattern(clean_image)
    print(f"  [Stage 3] Pattern: {pattern_data['pattern']} (confidence: {pattern_data['pattern_confidence']})")

    # ── Stage 4: Structural Features (CLIP) ──────────────────────────────────
    print("  [Stage 4] Detecting structural features via CLIP...")
    structural = detect_structural_features(clean_image)
    print(f"  [Stage 4] Neckline: {structural['neckline']} | Sleeve: {structural['sleeve_length']} | Length: {structural['garment_length']}")

    # ── Stage 5: Category Detection (CLIP) ───────────────────────────────────
    print("  [Stage 5] Detecting category via CLIP...")
    category = detect_category(clean_image)
    print(f"  [Stage 5] Category: {category}")

    # ── Stage 6: Formality Index ──────────────────────────────────────────────
    print("  [Stage 6] Inferring formality index...")
    formality = infer_formality(
        category=category,
        neckline=structural["neckline"],
        pattern=pattern_data["pattern"],
    )
    print(f"  [Stage 6] Formality: {formality}/10")

    # ── Stage 7: Style Archetype ──────────────────────────────────────────────
    print("  [Stage 7] Inferring style archetype...")
    archetype = infer_archetype(formality, category)
    print(f"  [Stage 7] Archetype: {archetype}")

    # ── Stage 8: Assemble DNA + Final Summary ─────────────────────────────────
    print("  [Stage 8] Assembling Garment DNA...")

    dna = {
        "item_id": str(uuid.uuid4()),
        "category": category,
        "visual_traits": {
            "dominant_color_hex": colors["dominant_color_hex"],
            "dominant_color_name": colors["dominant_color_name"],
            "secondary_color_hex": colors["secondary_color_hex"],
            "secondary_color_name": colors["secondary_color_name"],
            "pattern": pattern_data["pattern"],
            "pattern_confidence": pattern_data["pattern_confidence"],
        },
        "physical_traits": {
            "material": None,           # User must fill in AssetEditorModal
            "fit": None,               # User must fill in AssetEditorModal
            "sleeve_length": structural["sleeve_length"],
            "garment_length": structural["garment_length"],
            "neckline": structural["neckline"],
            "season": "All-Season",     # Default — can be overridden by user
        },
        "style_traits": {
            "formality_index": formality,
            "style_archetype": archetype,
        },
        "user_overrides": {
            "material": None,
            "fit": None,
            "formality_index": None,
        },
        "final_summary": "",           # Filled below after DNA is assembled
    }

    dna["final_summary"] = build_summary(dna)
    print(f"  [Stage 8] Summary: {dna['final_summary']}")

    # ── Save Output JSON ──────────────────────────────────────────────────────
    if output_path is None:
        output_path = str(p.parent / f"{p.stem}_dna.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dna, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Done! DNA saved -> {output_path}")
    print(f"   Clean image -> {clean_path}")

    return dna


# ─────────────────────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="AI Vogue — Garment DNA Extraction Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_garment_dna.py --image shirt.jpg
  python extract_garment_dna.py --image /path/to/blazer.png --output blazer_dna.json
        """
    )
    parser.add_argument(
        "--image", "-i",
        required=True,
        help="Path to the input garment image (jpg, png, webp, etc.)"
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Path to save the output DNA JSON (default: {image_name}_dna.json)"
    )
    parser.add_argument(
        "--no-clip",
        action="store_true",
        help="Skip CLIP-based detection (faster, but no neckline/sleeve/category detection)"
    )

    args = parser.parse_args()

    if not Path(args.image).exists():
        print(f"[ERROR] Image file not found: {args.image}")
        return 1

    try:
        dna = extract_dna(args.image, args.output)
        print("\n[DNA] Garment DNA:")
        print(json.dumps(dna, indent=2))
        return 0
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
