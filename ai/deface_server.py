"""Optional local PyDeface/FSL adapter. Not a bundled defacing engine or anonymity guarantee."""
import hmac
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from flask import Flask, jsonify, request, send_file
from io import BytesIO

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 600 * 1024 * 1024
token = os.environ.get('MEDANNOTATE_DEFACE_TOKEN', '')
if len(token) < 24:
    raise SystemExit('Set MEDANNOTATE_DEFACE_TOKEN to a random secret of at least 24 characters.')
executable = shutil.which('pydeface')
if not executable:
    raise SystemExit('Install PyDeface and its FSL dependencies first.')
origins = set(os.environ.get('MEDANNOTATE_ALLOWED_ORIGINS', 'http://127.0.0.1:8787').split(','))

@app.before_request
def access():
    origin = request.headers.get('Origin')
    if origin and origin not in origins:
        return jsonify(error='Origin denied'), 403
    if request.method == 'OPTIONS':
        return '', 204
    if not hmac.compare_digest(request.headers.get('Authorization', ''), 'Bearer ' + token):
        return jsonify(error='Unauthorized'), 401

@app.after_request
def cors(response):
    origin = request.headers.get('Origin')
    if origin in origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.route('/deface', methods=['POST', 'OPTIONS'])
def deface():
    # Temporary files are private to the service account, discarded after response bytes are read.
    with tempfile.TemporaryDirectory(prefix='medannotate-deface-') as directory:
        source = Path(directory) / 'input.nii'
        source.write_bytes(request.get_data())
        try:
            subprocess.run([executable, str(source)], cwd=directory, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=540)
            candidates = [Path(directory) / 'input_defaced.nii.gz', Path(directory) / 'input_defaced.nii']
            output = next((p for p in candidates if p.exists()), None)
            if not output:
                return jsonify(error='Defacing returned no output'), 500
            import nibabel as nib
            # Produce NIfTI-1 without inherited free-text fields or extension records.
            image = nib.load(str(output))
            result = nib.Nifti1Image(image.get_fdata(dtype='float32'), image.affine)
            result.header.set_xyzt_units('mm')
            destination = Path(directory) / 'clean.nii'
            nib.save(result, str(destination))
            return send_file(BytesIO(destination.read_bytes()), mimetype='application/octet-stream')
        except (subprocess.SubprocessError, OSError):
            return jsonify(error='Defacing failed; original volume remains unchanged in the app'), 500

if __name__ == '__main__':
    from waitress import serve
    serve(app, host='127.0.0.1', port=8768, threads=1)
