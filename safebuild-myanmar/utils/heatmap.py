import torch
import numpy as np
from PIL import Image
from torchvision import models, transforms
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

IMG_SIZE = 224

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def generate_heatmap(image: Image.Image, model=None):
    if model is None:
        from utils.predict import load_model
        model, _ = load_model()

    img_rgb = image.convert("RGB")
    img_resized = img_rgb.resize((IMG_SIZE, IMG_SIZE))
    input_tensor = transform(img_rgb).unsqueeze(0)

    target_layer = model.layer4[-1]

    with GradCAM(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(input_tensor=input_tensor)[0]

    rgb_img = np.array(img_resized).astype(np.float32) / 255.0
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

    result = Image.fromarray((visualization * 255).astype(np.uint8))
    return result