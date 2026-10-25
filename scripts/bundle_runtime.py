"""Bundle an official Electron runtime ZIP without executing target-platform binaries.
The caller supplies the matching official SHASUMS256.txt. Native launch QA and signing
must be done on the target OS; this script preserves runtime files and app symlinks.
"""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

parser = argparse.ArgumentParser()
parser.add_argument('--runtime', type=Path, required=True)
parser.add_argument('--official-name', required=True)
parser.add_argument('--checksums', type=Path, required=True)
parser.add_argument('--platform', choices=['windows', 'mac'], required=True)
parser.add_argument('--output', type=Path, required=True)
a = parser.parse_args()
root = Path(__file__).resolve().parent.parent
checksums = {line.split()[1].lstrip('*'): line.split()[0] for line in a.checksums.read_text().splitlines()}
with a.runtime.open('rb') as stream:
    actual = hashlib.file_digest(stream, 'sha256').hexdigest()
if actual != checksums[a.official_name]:
    raise SystemExit('Runtime checksum mismatch')
a.output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(a.runtime) as src, ZipFile(a.output, 'w', ZIP_DEFLATED, compresslevel=6) as out:
    for entry in src.infolist():
        old = entry.filename
        if a.platform == 'windows':
            entry.filename = 'MedAnnotate/' + ('MedAnnotate.exe' if old == 'electron.exe' else old)
        elif old.startswith('Electron.app/'):
            entry.filename = 'MedAnnotate.app/' + old[len('Electron.app/'):]
        # Retain ZipInfo external attributes so macOS framework symlinks survive.
        with src.open(old) as source, out.open(entry, 'w') as destination:
            while block := source.read(1024 * 1024):
                destination.write(block)
    base = 'MedAnnotate/resources/app/' if a.platform == 'windows' else 'MedAnnotate.app/Contents/Resources/app/'
    for folder in ['dist', 'desktop', 'ai']:
        for file in sorted((root / folder).rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts and file.suffix != '.pyc':
                out.write(file, base + file.relative_to(root).as_posix())
    package = json.loads((root / 'package.json').read_text())
    package.pop('devDependencies', None)
    out.writestr(base + 'package.json', json.dumps(package, indent=2))
    out.write(root / 'README.md', 'START-HERE.md')
    out.write(root / 'PRIVACY-AND-RELEASE.md', 'PRIVACY-AND-RELEASE.md')
    out.write(root / 'tests/VALIDATION.md', 'VALIDATION.md')
    out.writestr('PACKAGE-VERIFICATION.txt', f'Official runtime: {a.official_name}\nSHA256: {actual}\nApp version: {package["version"]}\nNative launch testing and product signing: not performed.\n')
print(a.output.name, a.output.stat().st_size)
