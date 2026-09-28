import numpy as np
import uuid

def load_and_preprocess(signal_text, sampling_rate=256, window_size=5.0, overlap=2.5):
    """
    Simulates loading and preprocessing. 
    In production, this would use MNE-Python to load EDF, apply bandpass filters, etc.
    """
    # Parse signal text
    if not signal_text:
        return []
        
    try:
        # Simplified parsing for CSV/TXT
        import re
        tokens = re.split(r'[\s,;\n\r\t]+', signal_text)
        values = [float(t) for t in tokens if t.strip()]
        
        # In a real scenario, this would be a multi-channel signal. 
        # Here we mock it by repeating a single channel to match `num_channels=8` or whatever is expected.
        num_channels = 8
        length = len(values)
        if length == 0: return []
        
        # Make a mock 2D array (channels x time)
        mock_eeg = np.zeros((num_channels, length))
        for i in range(num_channels):
            # add some channel-specific noise
            mock_eeg[i] = np.array(values) + np.random.normal(0, 0.1, length)
            
        # Segment into windows
        window_samples = int(window_size * sampling_rate)
        step_samples = int((window_size - overlap) * sampling_rate)
        
        windows = []
        start = 0
        while start + window_samples <= length:
            window = mock_eeg[:, start:start+window_samples]
            windows.append(window)
            start += step_samples
            
        return windows, length / sampling_rate
    except Exception as e:
        print(f"Preprocessing error: {e}")
        return [], 0
