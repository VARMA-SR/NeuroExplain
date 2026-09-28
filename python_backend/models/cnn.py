import torch
import torch.nn as nn

class Conv1DBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1, padding=1):
        super().__init__()
        self.conv = nn.Conv1d(in_channels, out_channels, kernel_size, stride, padding)
        self.bn = nn.BatchNorm1d(out_channels)
        self.activation = nn.GELU()
        self.pool = nn.MaxPool1d(2)

    def forward(self, x):
        return self.pool(self.activation(self.bn(self.conv(x))))

class EEGCNN(nn.Module):
    def __init__(self, num_channels=19, hidden_dims=[32, 64, 128]):
        super().__init__()
        layers = []
        in_c = num_channels
        for out_c in hidden_dims:
            layers.append(Conv1DBlock(in_c, out_c))
            in_c = out_c
        self.feature_extractor = nn.Sequential(*layers)
        self.out_channels = hidden_dims[-1]

    def forward(self, x):
        # x shape: (batch_size, num_channels, sequence_length)
        features = self.feature_extractor(x)
        return features
