import base64
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from extract_garment_dna import extract_dna

app = FastAPI(title="AI Vogue Garment DNA API")

# Allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    image_base64: str
    apply_bg_removal: bool = True

@app.post("/extract")
async def extract_garment(request: ExtractRequest):
    try:
        # Extract raw base64 data (strip data URI prefix if present)
        b64_data = request.image_base64
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
            
        img_bytes = base64.b64decode(b64_data)
        
        # Save to a temporary file
        tmp_dir = tempfile.gettempdir()
        file_id = str(uuid.uuid4())
        temp_img_path = Path(tmp_dir) / f"{file_id}.jpg"
        temp_img_path.write_bytes(img_bytes)
        
        # Run the extraction pipeline
        # The script will automatically create a _clean.png next to the input file
        dna = extract_dna(str(temp_img_path), output_path=str(temp_img_path.with_suffix('.json')))
        
        # Read the background-removed image back into base64
        clean_path = temp_img_path.parent / f"{temp_img_path.stem}_clean.png"
        clean_base64 = None
        if clean_path.exists():
            clean_bytes = clean_path.read_bytes()
            clean_base64 = f"data:image/png;base64,{base64.b64encode(clean_bytes).decode('utf-8')}"
            
            # Cleanup temp files
            clean_path.unlink()
            
        temp_img_path.unlink()
        temp_img_path.with_suffix('.json').unlink(missing_ok=True)
            
        return {
            "status": "success",
            "garment_dna": dna,
            "clean_image_base64": clean_base64,
            "detected_category": dna.get("category", "Topwear"),
            "detected_color_hex": dna.get("visual_traits", {}).get("dominant_color_hex", "#1a1a1a"),
            "confidence": 0.95
        }
        
    except Exception as e:
        print(f"Error extracting DNA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
