import onnx
import os
import numpy as np
from onnx import TensorProto

INPUT = "models/safebuild_resnet18.onnx"
DATA_FILE = "models/safebuild_resnet18.onnx.data"
OUTPUT = "models/safebuild_resnet18_clean.onnx"

ext_data_raw = np.fromfile(DATA_FILE, dtype=np.uint8)
m = onnx.load(INPUT, load_external_data=False)

count = 0
for init in m.graph.initializer:
    if init.data_location == TensorProto.EXTERNAL:
        metadata = {}
        for ed in init.external_data:
            metadata[ed.key] = int(ed.value) if ed.key in ("offset", "length") else ed.value
        
        offset = metadata["offset"]
        length = metadata["length"]
        raw = ext_data_raw[offset:offset+length]
        init.raw_data = raw.tobytes()
        init.data_location = TensorProto.DEFAULT
        count += 1

print("Fixed", count, "tensors")

for init in m.graph.initializer:
    if init.data_location == TensorProto.EXTERNAL:
        print("STILL EXTERNAL:", init.name)
        break
else:
    print("All data embedded!")

onnx.save(m, OUTPUT)
print("Saved:", os.path.getsize(OUTPUT), "bytes")
