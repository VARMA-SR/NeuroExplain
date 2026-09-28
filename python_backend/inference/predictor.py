import torch
import numpy as np
from ..models.seizure_detector import SeizureDetector
import uuid
from datetime import datetime

class Predictor:
    def __init__(self):
        self.model = SeizureDetector(num_channels=8, use_transformer=True)
        self.model.eval()
        self.model_version = "seizure_detector_v1.0"
        self.preprocessing_version = "preprocess_v1.0"
        
    def extract_features(self, window):
        # Basic time-domain features for report
        rms = np.sqrt(np.mean(window**2))
        max_abs = np.max(np.abs(window))
        
        # Simple zero crossing
        centered = window - np.mean(window)
        zero_crossings = np.sum(np.diff(np.sign(centered)) != 0)
        
        # Simple dominant frequency proxy (would use FFT normally)
        dominant_freq = "Alpha/Beta" if zero_crossings > 10 else "Delta/Theta"
        
        return {
            "amplitude_rms": float(rms),
            "max_amplitude": float(max_abs),
            "zero_crossings": int(zero_crossings),
            "dominant_frequency_band": dominant_freq
        }

    def predict(self, windows, file_hash="unknown"):
        if not windows:
            return None
            
        events = []
        all_features = []
        
        with torch.no_grad():
            for i, window in enumerate(windows):
                # Shape: (1, channels, seq_len)
                tensor_window = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
                logits = self.model(tensor_window)
                probs = torch.softmax(logits, dim=1)
                
                seizure_prob = probs[0][1].item()
                
                # Mock features
                feat = self.extract_features(window[0]) # features for channel 0
                all_features.append(feat)
                
                # Window is 5s, overlap 2.5s -> step is 2.5s
                start_time = i * 2.5
                end_time = start_time + 5.0
                
                if seizure_prob > 0.5:
                    events.append({
                        "start": start_time,
                        "end": end_time,
                        "probability": seizure_prob
                    })
                    
        # Aggregate adjacent events
        aggregated_events = []
        if events:
            current_event = events[0]
            for event in events[1:]:
                # If they overlap or are exactly adjacent
                if event["start"] <= current_event["end"]:
                    current_event["end"] = max(current_event["end"], event["end"])
                    current_event["probability"] = max(current_event["probability"], event["probability"])
                else:
                    aggregated_events.append(current_event)
                    current_event = event
            aggregated_events.append(current_event)
            
        overall_prediction = "seizure" if len(aggregated_events) > 0 else "non-seizure"
        overall_prob = max([e["probability"] for e in events]) if events else 0.05
        
        # Average features
        avg_features = {
            "amplitude_rms": np.mean([f["amplitude_rms"] for f in all_features]) if all_features else 0,
            "max_amplitude": np.mean([f["max_amplitude"] for f in all_features]) if all_features else 0,
            "dominant_frequency_band": all_features[0]["dominant_frequency_band"] if all_features else "Unknown"
        }

        return {
            "analysis_id": str(uuid.uuid4()),
            "file_hash": file_hash,
            "timestamp": datetime.now().isoformat(),
            "model_version": self.model_version,
            "preprocessing_version": self.preprocessing_version,
            "prediction": overall_prediction,
            "probability": float(overall_prob),
            "events": aggregated_events,
            "features": avg_features,
            "relevant_channels": ["Fp1-F7", "F7-T3"] # Mocked for now
        }
