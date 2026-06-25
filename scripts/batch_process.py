"""
AI Vogue — Batch Garment DNA Processor
=======================================
Processes a whole folder of garment images at once, producing a DNA JSON
and clean background-removed PNG for each one.

Usage:
    python batch_process.py --input ./my_wardrobe_photos/ --output ./dna_output/

Arguments:
    --input   : Directory containing garment images (jpg, png, webp)
    --output  : Directory to write _clean.png and _dna.json files into
    --workers : Number of parallel threads (default: 1, safe default)
    --resume  : Skip images that already have a _dna.json in the output dir
"""

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}


def process_single(image_path: Path, output_dir: Path, resume: bool) -> dict:
    """Process one image and return a result dict."""
    from extract_garment_dna import extract_dna

    dna_output_path = output_dir / f"{image_path.stem}_dna.json"

    # Skip if already processed (resume mode)
    if resume and dna_output_path.exists():
        return {
            "file": image_path.name,
            "status": "skipped",
            "reason": "Already processed (resume mode)",
        }

    try:
        dna = extract_dna(str(image_path), str(dna_output_path))

        # Also copy clean image to output dir
        src_clean = image_path.parent / f"{image_path.stem}_clean.png"
        if src_clean.exists():
            import shutil
            dest_clean = output_dir / src_clean.name
            shutil.move(str(src_clean), str(dest_clean))

        return {
            "file": image_path.name,
            "status": "success",
            "category": dna.get("category"),
            "pattern": dna.get("visual_traits", {}).get("pattern"),
            "formality": dna.get("style_traits", {}).get("formality_index"),
            "summary": dna.get("final_summary"),
        }

    except Exception as e:
        return {
            "file": image_path.name,
            "status": "error",
            "error": str(e),
        }


def batch_process(input_dir: str, output_dir: str, workers: int = 1, resume: bool = False):
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    if not input_path.exists():
        print(f"❌ Input directory not found: {input_dir}")
        return

    output_path.mkdir(parents=True, exist_ok=True)

    # Find all supported image files
    images = [
        f for f in input_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not images:
        print(f"⚠️  No supported images found in: {input_dir}")
        print(f"   Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
        return

    print(f"\n🧬 AI Vogue Batch DNA Processor")
    print(f"   Found {len(images)} image(s) in: {input_dir}")
    print(f"   Output directory: {output_dir}")
    print(f"   Workers: {workers}")
    print(f"   Resume mode: {'ON' if resume else 'OFF'}")
    print("─" * 60)

    results = []
    start_time = time.time()

    if workers <= 1:
        # Sequential processing (safe, recommended)
        for i, img in enumerate(images, 1):
            print(f"\n[{i}/{len(images)}] Processing: {img.name}")
            result = process_single(img, output_path, resume)
            results.append(result)
            status_icon = "✅" if result["status"] == "success" else ("⏭️" if result["status"] == "skipped" else "❌")
            print(f"  {status_icon} {result['status'].upper()}")
    else:
        # Parallel processing
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_img = {
                executor.submit(process_single, img, output_path, resume): img
                for img in images
            }
            completed = 0
            for future in as_completed(future_to_img):
                completed += 1
                result = future.result()
                results.append(result)
                status_icon = "✅" if result["status"] == "success" else ("⏭️" if result["status"] == "skipped" else "❌")
                print(f"  [{completed}/{len(images)}] {status_icon} {result['file']} — {result['status'].upper()}")

    # ── Summary Report ────────────────────────────────────────────────────────
    elapsed = time.time() - start_time
    successful = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "error"]
    skipped = [r for r in results if r["status"] == "skipped"]

    print("\n" + "─" * 60)
    print(f"🎉 Batch complete in {elapsed:.1f}s")
    print(f"   ✅ Success:  {len(successful)}")
    print(f"   ❌ Failed:   {len(failed)}")
    print(f"   ⏭️  Skipped:  {len(skipped)}")

    if failed:
        print("\n⚠️  Failed files:")
        for r in failed:
            print(f"   • {r['file']}: {r.get('error', 'Unknown error')}")

    # Save batch results summary
    summary_path = output_path / "batch_results.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "total": len(images),
            "successful": len(successful),
            "failed": len(failed),
            "skipped": len(skipped),
            "elapsed_seconds": round(elapsed, 2),
            "results": results,
        }, f, indent=2)

    print(f"\n   📊 Full results saved → {summary_path}")


def main():
    parser = argparse.ArgumentParser(
        description="AI Vogue — Batch Garment DNA Processor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python batch_process.py --input ./wardrobe_photos/ --output ./dna_output/
  python batch_process.py --input ./photos/ --output ./output/ --resume
  python batch_process.py --input ./photos/ --output ./output/ --workers 2
        """
    )
    parser.add_argument("--input", "-i", required=True, help="Input directory of garment images")
    parser.add_argument("--output", "-o", required=True, help="Output directory for DNA JSONs and clean images")
    parser.add_argument("--workers", "-w", type=int, default=1, help="Number of parallel processing threads (default: 1)")
    parser.add_argument("--resume", action="store_true", help="Skip images that already have output DNA files")

    args = parser.parse_args()
    batch_process(args.input, args.output, args.workers, args.resume)


if __name__ == "__main__":
    main()
