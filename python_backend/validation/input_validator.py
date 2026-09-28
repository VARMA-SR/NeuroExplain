import os
import json

def validate_file(file_path, file_content=None):
    # Determine whether the uploaded file is a supported EEG input.
    # Accept supported formats: CSV, EDF (mocked validation for CSV for now)
    
    if not file_path:
        return {"valid": False, "reason": "No file provided", "confidence": 1.0}
        
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext not in ['.csv', '.edf', '.txt']:
        return {
            "valid": False,
            "input_type": "unknown",
            "reason": f"Input format {ext} is not a supported EEG signal format. Do not upload random photographs or screenshots.",
            "confidence": 0.99
        }
        
    if file_content:
        # Check if it's numerical data
        try:
            # Just check the first few lines to ensure it's not arbitrary text
            lines = file_content.split('\n')[:5]
            is_numeric = False
            for line in lines:
                parts = line.replace(',', ' ').split()
                if any(p.replace('.','',1).replace('-','',1).isdigit() for p in parts):
                    is_numeric = True
                    break
                    
            if not is_numeric:
                return {
                    "valid": False,
                    "input_type": "text/other",
                    "reason": "File does not contain numerical EEG data.",
                    "confidence": 0.95
                }
        except Exception as e:
            return {"valid": False, "reason": "Failed to parse file content", "confidence": 0.9}

    return {
        "valid": True,
        "input_type": "EEG",
        "channels": 19, # Mocked for now
        "sampling_rate": 256,
        "duration_seconds": 3600 # Will be updated during preprocessing
    }
