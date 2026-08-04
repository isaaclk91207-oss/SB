import torch
from torchvision import models
import os
import onnx

os.environ["PYTHONIOENCODING"] = "utf-8"

MODEL_PATH = os.path.join("models", "safebuild_resnet18.pth")
ONNX_PATH = os.path.join("models", "safebuild_resnet18.onnx")

checkpoint = torch.load(MODEL_PATH, map_location="cpu")
num_classes = checkpoint["num_classes"]
class_names = checkpoint["class_names"]

model = models.resnet18()
model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    ONNX_PATH,
    export_params=True,
    opset_version=14,
    do_constant_folding=True,
    input_names=["input"],
    output_names=["output"],
)

print("Exported. Now checking for external data...")

model_onnx = onnx.load(ONNX_PATH)

has_external = False
for initializer in model_onnx.graph.initializer:
    if initializer.data_location == onnx.TensorProto.EXTERNAL:
        has_external = True
        break

if has_external:
    print("Model has external data. Converting to inline...")
    from onnx import external_data_helper, TensorProto
    import numpy as np

    for initializer in model_onnx.graph.initializer:
        if initializer.data_location == TensorProto.EXTERNAL:
            data = external_data_helper.load_external_data(initializer, os.path.dirname(ONNX_PATH))
            initializer.raw_data = data.tobytes()
            initializer.data_location = TensorProto.DEFAULT

    onnx.save(model_onnx, ONNX_PATH)
    print("Converted to inline model.")

final_size = os.path.getsize(ONNX_PATH)
print(f"Final ONNX model: {final_size} bytes ({final_size/1024:.1f} KB)")
print(f"Classes: {class_names}")
