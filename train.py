import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, Subset
from sklearn.model_selection import train_test_split

# Config
DATA_DIR = "data"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "safebuild_resnet18.pth")
BATCH_SIZE = 16
EPOCHS = 15
LR = 0.001
IMG_SIZE = 224

# Transforms
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# Load dataset with train transform (default)
print("Loading dataset...")
full_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transform)
class_names = full_dataset.classes
print(f"Classes: {class_names}")
print(f"Total images: {len(full_dataset)}")

# Split indices 80/20
indices = list(range(len(full_dataset)))
labels = [s[1] for s in full_dataset.samples]
train_idx, val_idx = train_test_split(indices, test_size=0.2, stratify=labels, random_state=42)

# Create separate datasets with different transforms
train_dataset = Subset(datasets.ImageFolder(DATA_DIR, transform=train_transform), train_idx)
val_dataset = Subset(datasets.ImageFolder(DATA_DIR, transform=val_transform), val_idx)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

print(f"Train: {len(train_idx)}, Val: {len(val_idx)}")

# Load pretrained ResNet18
print("Loading ResNet18...")
model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

# Freeze all layers except final FC
for param in model.parameters():
    param.requires_grad = False

# Replace final FC layer for 3 classes
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 3)

# Training setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.fc.parameters(), lr=LR)

print(f"Device: {device}")
print("Starting training...")

# Training loop
best_val_acc = 0.0
for epoch in range(EPOCHS):
    # Train
    model.train()
    train_loss = 0.0
    train_correct = 0
    train_total = 0
    
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        _, predicted = outputs.max(1)
        train_total += labels.size(0)
        train_correct += predicted.eq(labels).sum().item()
    
    train_acc = 100.0 * train_correct / train_total
    
    # Validate
    model.eval()
    val_loss = 0.0
    val_correct = 0
    val_total = 0
    
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            val_loss += loss.item()
            _, predicted = outputs.max(1)
            val_total += labels.size(0)
            val_correct += predicted.eq(labels).sum().item()
    
    val_acc = 100.0 * val_correct / val_total
    
    print(f"Epoch {epoch+1}/{EPOCHS} | "
          f"Train Loss: {train_loss/len(train_loader):.4f} Acc: {train_acc:.1f}% | "
          f"Val Loss: {val_loss/len(val_loader):.4f} Acc: {val_acc:.1f}%")
    
    # Save best model
    if val_acc >= best_val_acc:
        best_val_acc = val_acc
        torch.save({
            "model_state_dict": model.state_dict(),
            "class_names": class_names,
            "num_classes": len(class_names),
        }, MODEL_PATH)
        print(f"  -> Saved best model (val acc: {val_acc:.1f}%)")

print(f"\nTraining complete! Best val accuracy: {best_val_acc:.1f}%")
print(f"Model saved to: {MODEL_PATH}")