#!/bin/bash
# AI Vogue — Garment DNA Pipeline Setup Script
# Run this once to install dependencies and download the CLIP model.

set -e  # Exit on any error

echo ""
echo "🧬 AI Vogue — Garment DNA Extraction Pipeline Setup"
echo "════════════════════════════════════════════════════"
echo ""

# Check Python version
PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
echo "✅ Python version: $PYTHON_VERSION"

MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
if [ "$MAJOR" -lt 3 ] || ([ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]); then
    echo "❌ Error: Python 3.10 or higher is required."
    echo "   Install from: https://www.python.org/downloads/"
    exit 1
fi

# Check pip
echo "✅ Checking pip..."
pip --version > /dev/null 2>&1 || { echo "❌ pip not found. Please install pip."; exit 1; }

# Navigate to scripts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "📦 Installing Python dependencies..."
echo "   (This may take a few minutes on first run)"
echo ""

pip install -r requirements.txt

echo ""
echo "🤖 Downloading CLIP model (openai/clip-vit-base-patch32)..."
echo "   One-time download, approximately 350MB"
echo "   This will be cached and reused on every subsequent run."
echo ""

python -c "
from transformers import CLIPProcessor, CLIPModel
print('  Downloading CLIPModel...')
CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
print('  Downloading CLIPProcessor...')
CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
print('  CLIP model ready!')
"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "📖 Usage:"
echo "   Single image:  python extract_garment_dna.py --image YOUR_IMAGE.jpg"
echo "   Batch folder:  python batch_process.py --input ./photos/ --output ./output/"
echo ""
echo "   Output files:"
echo "     {name}_clean.png  — background-removed garment image"
echo "     {name}_dna.json   — Garment DNA JSON (send this to Groq)"
echo ""
echo "   See README.md for full documentation and React app integration."
echo "════════════════════════════════════════════════════"
