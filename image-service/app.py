from fastapi import FastAPI, File, UploadFile
from pathlib import Path
import io
from PIL import Image
import numpy as np
import torch
import clip
import faiss
import json

app = FastAPI()

DB_DIR = Path("image_store")
DB_DIR.mkdir(exist_ok=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

paths = []
embed_dim = 512
index = faiss.IndexFlatL2(embed_dim)

def image_to_embedding(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        emb = model.encode_image(tensor)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb.cpu().numpy().astype("float32")

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    data = await file.read()
    emb = image_to_embedding(data)

    path = DB_DIR / file.filename
    with open(path, "wb") as f:
        f.write(data)

    paths.append(str(path))
    index.add(emb)

    return {"status": "saved", "filename": file.filename}

@app.post("/search")
async def search(file: UploadFile = File(...), k: int = 5):
    data = await file.read()
    q = image_to_embedding(data)

    distances, ids = index.search(q, k)

    result = []
    for dist, idx in zip(distances[0], ids[0]):
        if idx >= 0:
            result.append({
                "path": paths[idx],
                "distance": float(dist)
            })

    return result
