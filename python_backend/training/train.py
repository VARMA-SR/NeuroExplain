import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.seizure_detector import SeizureDetector
from dataset import EEGDataset

def train_model(data_path, num_epochs=10, batch_size=32):
    print("Initializing dataset...")
    # Using max_samples to prevent memory overload on 2.6GB file during testing
    dataset = EEGDataset(csv_file=data_path, max_samples=50000) 
    
    if len(dataset) == 0:
        print("Dataset is empty or could not be loaded. Aborting training.")
        return

    # Split: 80% train, 20% validation
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # Initialize model
    # Note: dataset returns all channels. 
    # Let's get the number of channels from the first sample.
    sample_data, _ = train_dataset[0]
    num_channels = sample_data.shape[0]
    print(f"Detected {num_channels} channels. Initializing model...")

    model = SeizureDetector(num_channels=num_channels, use_transformer=True)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print("Starting training loop...")
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        for i, (inputs, labels) in enumerate(train_loader):
            optimizer.zero_grad()
            
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
        val_acc = 100 * correct / total if total > 0 else 0
        print(f"Epoch {epoch+1}/{num_epochs} - Loss: {running_loss/len(train_loader):.4f} - Val Loss: {val_loss/len(val_loader):.4f} - Val Acc: {val_acc:.2f}%")

    print("Training complete. Saving checkpoint...")
    os.makedirs(os.path.join(os.path.dirname(__file__), "../checkpoints"), exist_ok=True)
    torch.save(model.state_dict(), os.path.join(os.path.dirname(__file__), "../checkpoints/seizure_detector_v1.0.pth"))
    print("Model saved to checkpoints/seizure_detector_v1.0.pth")

if __name__ == "__main__":
    dataset_path = r"C:\Users\tunas\Downloads\neuroexplain-source\datasets\EEG_Scaled_data.csv"
    train_model(dataset_path)
