from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import hashlib
import time

from validation.input_validator import validate_file
from preprocessing.filters import load_and_preprocess
from inference.predictor import Predictor

app = FastAPI(title="EEG Seizure Detection API")
predictor = Predictor()

class AnalyzeRequest(BaseModel):
    file_name: str
    file_type: str
    signal_text: str

@app.post("/validate-input")
def api_validate_input(req: AnalyzeRequest):
    val_result = validate_file(req.file_name, req.signal_text)
    return val_result

@app.post("/analyze")
def analyze_eeg(req: AnalyzeRequest):
    # 1. Validate
    val_result = validate_file(req.file_name, req.signal_text)
    if not val_result.get("valid", False):
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error_code": "INVALID_EEG",
            "message": val_result.get("reason", "The uploaded file could not be validated as a supported EEG recording.")
        })
        
    # 2. Preprocess
    start_time = time.time()
    windows, duration = load_and_preprocess(req.signal_text)
    
    if len(windows) == 0:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error_code": "INSUFFICIENT_DATA",
            "message": "The signal duration is too short for analysis or data is corrupted."
        })
        
    # 3. Predict
    file_hash = hashlib.md5(req.signal_text.encode()).hexdigest()
    result = predictor.predict(windows, file_hash=file_hash)
    
    result["duration_seconds"] = duration
    result["processing_time_ms"] = int((time.time() - start_time) * 1000)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
