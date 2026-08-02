import os
import torch
from torchvision import models, transforms
from PIL import Image

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "safebuild_resnet18.pth")
IMG_SIZE = 224

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

_model = None
_class_names = None


def load_model():
    global _model, _class_names
    if _model is not None:
        return _model, _class_names

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    _class_names = checkpoint["class_names"]

    _model = models.resnet18()
    _model.fc = torch.nn.Linear(_model.fc.in_features, checkpoint["num_classes"])
    _model.load_state_dict(checkpoint["model_state_dict"])
    _model.eval()

    return _model, _class_names


def predict(image: Image.Image):
    model, class_names = load_model()

    img = image.convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        output = model(tensor)
        probs = torch.nn.functional.softmax(output, dim=1)
        pred_idx = probs.argmax(dim=1).item()
        confidence = probs[0][pred_idx].item()

    pred_class = class_names[pred_idx]
    return pred_class, confidence, class_names