import torch
from torchvision import models
import os
import numpy as np
from onnx import TensorProto, numpy_helper, helper

os.environ["PYTHONIOENCODING"] = "utf-8"

MODEL_PATH = "models/safebuild_resnet18.pth"
ONNX_PATH = "models/safebuild_resnet18_final.onnx"

checkpoint = torch.load(MODEL_PATH, map_location="cpu")
num_classes = checkpoint["num_classes"]

model = models.resnet18()
model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(model, dummy, ONNX_PATH, opset_version=18,
                   input_names=["input"], output_names=["output"],
                   dynamic_axes=None)

print("Raw export done")

# Now rebuild: load with external data, embed everything, save clean
import onnx
m = onnx.load(ONNX_PATH, load_external_data=False)

# Load external data file
DATA_FILE = ONNX_PATH + ".data"
ext_data = np.fromfile(DATA_FILE, dtype=np.uint8) if os.path.exists(DATA_FILE) else None

count = 0
for init in m.graph.initializer:
    if init.data_location == TensorProto.EXTERNAL:
        if ext_data is not None:
            meta = {}
            for ed in init.external_data:
                meta[ed.key] = int(ed.value) if ed.key in ("offset", "length") else ed.value
            raw = ext_data[meta["offset"]:meta["offset"]+meta["length"]]
            init.raw_data = raw.tobytes()
        init.data_location = TensorProto.DEFAULT
        count += 1

print("Embedded", count, "tensors")

# Save with external_data=False to force everything inline
onnx.save(m, ONNX_PATH)

# Verify
m2 = onnx.load(ONNX_PATH)
ext = sum(1 for i in m2.graph.initializer if i.data_location == TensorProto.EXTERNAL)
print("Final external tensors:", ext)
print("Final size:", os.path.getsize(ONNX_PATH), "bytes")
