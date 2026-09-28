import torch
import torch.nn as nn
from .cnn import EEGCNN

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)

    def forward(self, x):
        # x shape: (seq_len, batch_size, d_model)
        x = x + self.pe[:x.size(0), :]
        return x

class SeizureDetector(nn.Module):
    def __init__(self, num_channels=19, num_classes=2, use_transformer=True):
        super().__init__()
        self.use_transformer = use_transformer
        self.cnn = EEGCNN(num_channels=num_channels)
        
        # We need math for positional encoding
        import math
        
        if use_transformer:
            self.d_model = self.cnn.out_channels
            self.pos_encoder = PositionalEncoding(self.d_model)
            encoder_layers = nn.TransformerEncoderLayer(d_model=self.d_model, nhead=4, dim_feedforward=256, dropout=0.1)
            self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers=2)
            self.classifier = nn.Linear(self.d_model, num_classes)
        else:
            self.classifier = nn.Linear(self.cnn.out_channels, num_classes)
            
    def forward(self, x):
        # x shape: (batch_size, channels, seq_len)
        features = self.cnn(x) # (batch, out_channels, new_seq_len)
        
        if self.use_transformer:
            # Transformer expects (seq_len, batch, d_model)
            features = features.permute(2, 0, 1) 
            features = self.pos_encoder(features)
            output = self.transformer_encoder(features)
            # Global average pooling over sequence length
            pooled = output.mean(dim=0) # (batch, d_model)
        else:
            # Just global average pooling for CNN baseline
            pooled = features.mean(dim=-1)
            
        logits = self.classifier(pooled)
        return logits
