import os
import numpy as np
import torch
from torch.utils.data import Dataset
import csv

class EEGDataset(Dataset):
    def __init__(self, csv_file, window_size_sec=5.0, sampling_rate=256, max_samples=None):
        """
        Args:
            csv_file (string): Path to the csv file with EEG data.
            window_size_sec (float): Length of the window in seconds.
            sampling_rate (int): Sampling rate of the EEG.
        """
        self.csv_file = csv_file
        self.window_size_sec = window_size_sec
        self.sampling_rate = sampling_rate
        self.window_samples = int(window_size_sec * sampling_rate)
        
        self.data_cache = []
        self.labels = []
        
        print(f"Loading dataset from {csv_file}...")
        self._load_data(max_samples)
        
    def _load_data(self, max_samples):
        # This is a naive loader for the baseline.
        # In production, a memory-mapped or chunked loader is required for 2.6GB files.
        try:
            # We'll read a limited amount of rows to avoid memory crash
            import pandas as pd
            
            # Using chunksize to read a portion
            chunk_iter = pd.read_csv(self.csv_file, chunksize=self.window_samples, nrows=max_samples)
            
            for i, chunk in enumerate(chunk_iter):
                if len(chunk) < self.window_samples:
                    continue
                    
                # Assuming shape is (time_steps, channels)
                # We need (channels, time_steps)
                window_data = chunk.values.T 
                
                # Mock label generation since the CSV only has Channel data and no explicit labels.
                # Usually, labels are provided in a separate file or column.
                # For baseline demonstration, we inject a mock label based on variance.
                variance = np.var(window_data)
                label = 1 if variance > 10.0 else 0
                
                self.data_cache.append(window_data)
                self.labels.append(label)
                
                if max_samples and (i+1)*self.window_samples >= max_samples:
                    break
                    
            print(f"Loaded {len(self.data_cache)} windows.")
        except Exception as e:
            print(f"Error loading dataset: {e}")

    def __len__(self):
        return len(self.data_cache)

    def __getitem__(self, idx):
        data = self.data_cache[idx]
        label = self.labels[idx]
        # Shape: (channels, seq_len)
        return torch.tensor(data, dtype=torch.float32), torch.tensor(label, dtype=torch.long)
