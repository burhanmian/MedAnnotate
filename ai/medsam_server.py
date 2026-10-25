"""Optional MedSAM v1 box-prompt adapter. Install official MedSAM and supply its weights.
No checkpoint or torch runtime is bundled. Bind to loopback unless behind authenticated TLS.
"""
import base64
import hmac
import io
import os
import threading
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from flask import Flask, jsonify, request
from PIL import Image
from segment_anything import sam_model_registry

checkpoint = Path(os.environ.get('MEDSAM_CHECKPOINT', 'medsam_vit_b.pth')).expanduser()
if not checkpoint.is_file():
    raise SystemExit('Set MEDSAM_CHECKPOINT to the official medsam_vit_b.pth checkpoint.')
api_token = os.environ.get('MEDANNOTATE_MODEL_TOKEN', '')
if len(api_token) < 24:
    raise SystemExit('Set MEDANNOTATE_MODEL_TOKEN to a random secret of at least 24 characters.')
allowed_origins = set(os.environ.get('MEDANNOTATE_ALLOWED_ORIGINS', 'http://127.0.0.1:8787,http://localhost:8787').split(','))
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = sam_model_registry['vit_b'](checkpoint=str(checkpoint)).to(device).eval()
lock = threading.Lock()
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 12 * 1024 * 1024

@app.before_request
def authorize():
    origin = request.headers.get('Origin')
    if origin and origin not in allowed_origins:
        return jsonify(error='Origin is not allowed'), 403
    if request.method == 'OPTIONS':
        return '', 204
    if not hmac.compare_digest(request.headers.get('Authorization', ''), 'Bearer ' + api_token):
        return jsonify(error='Unauthorized'), 401

@app.after_request
def cors(response):
    origin = request.headers.get('Origin')
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.route('/segment', methods=['POST', 'OPTIONS'])
def segment():
    try:
        payload = request.get_json()
        image = Image.open(io.BytesIO(base64.b64decode(payload['image'], validate=True)))
        width, height = image.size
        if width * height > 4_000_000 or width < 2 or height < 2:
            raise ValueError('Unsupported slice dimensions')
        if payload['width'] != width or payload['height'] != height:
            raise ValueError('Declared dimensions do not match PNG')
        box = np.asarray(payload['box'], dtype=np.float32)
        if box.shape != (4,) or not np.isfinite(box).all():
            raise ValueError('box must contain four finite numbers')
        x0, y0, x1, y1 = box
        if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
            raise ValueError('Invalid box boundaries')
        # MedSAM v1 expects an independently resized 1024-square RGB image in [0,1].
        resized = np.asarray(image.convert('RGB').resize((1024, 1024), Image.Resampling.BILINEAR), dtype=np.float32)
        resized = (resized - resized.min()) / max(float(resized.max() - resized.min()), 1e-8)
        tensor = torch.as_tensor(resized.transpose(2, 0, 1), device=device).unsqueeze(0)
        box = box / np.array([width, height, width, height], dtype=np.float32) * 1024
        prompt = torch.as_tensor(box, device=device).reshape(1, 1, 4)
        with lock, torch.inference_mode():
            embedding = model.image_encoder(tensor)
            sparse, dense = model.prompt_encoder(points=None, boxes=prompt, masks=None)
            logits, _ = model.mask_decoder(image_embeddings=embedding,
                image_pe=model.prompt_encoder.get_dense_pe(), sparse_prompt_embeddings=sparse,
                dense_prompt_embeddings=dense, multimask_output=False)
            probability = F.interpolate(torch.sigmoid(logits), size=(height, width), mode='bilinear', align_corners=False)
            mask = (probability[0, 0] > 0.5).to('cpu').numpy().astype(np.uint8)
        return jsonify(width=width, height=height, mask=mask.ravel().tolist(), model='MedSAM-v1-vit_b')
    except (KeyError, ValueError, TypeError) as exc:
        return jsonify(error=str(exc)), 400

if __name__ == '__main__':
    from waitress import serve
    serve(app, host='127.0.0.1', port=int(os.environ.get('MEDANNOTATE_MODEL_PORT', '8766')), threads=2)
