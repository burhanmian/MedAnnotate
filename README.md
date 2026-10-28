# MedAnnotate 1.4

**A product of Mian Burhan Aftab.**

A local medical-image viewing, sorting and annotation workspace for CT, MRI, X-ray, mammography and dental imaging. Supported encodings and conversion limits are documented below.

## Start using it

- **Web:** open the published MedAnnotate Site in a current desktop browser. No Python or Node installation is required. Images and browser autosave remain on the computer running that browser.
- **Windows portable package:** extract the entire ZIP, then open `MedAnnotate.exe`. Keep the adjacent runtime files and `resources` folder together. No Node or Python is required.
- **macOS portable package:** extract the ZIP matching your Mac (Apple Silicon or Intel) and open `MedAnnotate.app`. It is an unsigned/unnotarized application package and has not been launch-tested on macOS. Your security settings may prevent opening it; a signed distribution requires a macOS build and Apple developer identity.
- **Local web/source package:** with Node.js 22 installed, run `node serve.cjs` and open `http://127.0.0.1:8787`. Windows and macOS launchers are included. The viewer works offline once served locally; first-time trained-model setup requires internet access. Imported images stay in the browser unless you explicitly request a connected model; managed local inference uses a loopback service.

The portable packages bundle the official Electron 40.0.0 runtime. Runtime archives are verified against the release's SHA-256 checksums. Packaged native applications are not equivalent to native launch-tested or signed installers. Windows NSIS and macOS DMG build configuration is also included for subsequent signed releases.

## New in 1.4

- Open supported NanoPix `.ioss` images directly in the built-in viewer and sort their original files into dental folders.
- Export a single 16-bit image as derived DICOM and reopen it inside MedAnnotate.
- Prepare a trained local model automatically, with download verification and visible setup progress.
- Connect 3D segmentation models through Segmentation studio and export reviewed learning datasets.

See [Advanced workflows](ADVANCED-WORKFLOWS.md) for exact support boundaries and [Validation](VALIDATION-1.4.md) for checks performed.

## Automatic folder organization

1. Start the app and open **Organize scans**.
2. Choose a mixed folder (use **Scan desktop folders** in the desktop app for large files).
3. Choose **Automatically organize all files** and a separate output folder. In browsers without folder-writing support, use **Download automatic sorted ZIP**.
4. Inspect `REVIEW` and the transfer journal. Automatic sorting never approves annotation or changes source files.

Clear DICOM text can identify periapical, bitewing, panoramic, cephalometric, CBCT and general dental scans, plus brain, spine, head/neck, chest, cardiac, breast, abdomen/pelvis and limb regions. Ambiguous abbreviations such as `PA` are not assumed to mean periapical. Classification uses metadata, not image interpretation, and is not a universal anatomical classifier.

Recognized images use `Category/Modality/Subject/Study/Series/`. Subject and study names are keyed pseudonyms rather than patient names or dates. Unknown formats—including intraoral meshes, reports, whole-slide images and linked volume formats—are copied without renaming under `REVIEW/ORIGINAL_FILES/<original relative path>`. Their names and content remain private. Only companion files within that preserved subtree retain their relative links; references to files outside the selected batch or to separately categorized images may need repair. Hidden entries and symlinks are excluded. Corrupt or oversized browser inputs appear in the skipped list; always check it.

Compressed and non-spatial dental DICOM can be **sorted** from metadata even when the annotation viewer cannot open it. Sorting support does not add compressed DICOM decoding, mesh rendering or report interpretation.

For a local command-line batch using Node.js 22 or newer:

```sh
node scripts/sort.cjs "/path/to/mixed" "/path/to/sorted"
node scripts/sort.cjs "/path/to/mixed" "/path/to/sorted" --copy
```

The first command previews only. The second copies and verifies files, preserving originals. A private `.medannotate-sort-key` in the destination keeps pseudonyms stable across command-line runs; do not publish it. Existing files are never overwritten. Failed copies produce a nonzero exit code. No model, API key, or network connection is needed for sorting.

## Your first dataset

1. Try the synthetic practice volume to learn the controls. Synthetic cases never enter training exports.
2. In **Project settings**, replace Structure A/B/C with your agreed target names, colors and integer labels. Add a `definition` to each label containing the anatomical boundary rules. Labels for nnU-Net export must be ordered 1, 2, 3…; 0 is reserved for background.
3. Set the project name, classification fields, required landmark names and expected acquisition parameters. Set `targetsConfirmed` to `true` only when your reviewer has agreed the definitions. The supplied protocol has placeholders, so the app does not assume a tumor type or invent anatomical labels.
4. Use **Organize scans** for mixed folders. Review anatomy and subject assignments, then copy or open selected series. Import NIfTI, supported DICOM or PNG/JPEG. Create/unlock the encrypted reference vault when prompted. Open **Privacy intake**, run the local OCR scan, review text masking and facial risk, and record clearance before annotation. Download an encrypted reference backup separately from the project backup. Import all slices of each DICOM series together.
5. In **Review**, inspect acquisition details and verify every checklist item. Assign the same pseudonymous **subject group ID** to every series from the same person. The private vault links matching DICOM patient IDs/issuers; manually group deidentified NIfTI and missing or inconsistent identifiers. Never enter a patient name as a group ID.
6. Review the volume, paint labels in all relevant slices, place landmarks, and select case classifications. See the controls below.
7. Accept or discard each assisted suggestion after inspecting it. Flag uncertain cases with a reason.
8. Complete self-review and mark the case reviewed. An intentionally empty mask requires an explicit negative-case confirmation. Changing a reviewed mask returns it to draft.
9. Save a portable project backup regularly. Browser autosave is tied to this browser profile and origin; clearing site data deletes it. Project backups contain images and annotations and can be reopened on another computer.
10. **Export dataset** creates a ZIP containing only eligible, reviewed, non-practice cases. Training, validation and test assignment is deterministic for the chosen seed and grouped by subject ID. Flagged/draft cases are reported but excluded.

## Sorting, privacy and release controls

**Organize scans** scans mixed folders recursively and recognizes dental subtypes and broader body regions from metadata/path words. Automatic copy places clear metadata matches into category folders and uncertain files into REVIEW. Brain/spine conflicts and weak filename matches require confirmation. Desktop copy verifies SHA-256 and refuses overwrites/symlink destinations. Desktop move copies and verifies first, then sends unchanged originals to the operating system trash after confirmation. Duplicates and failed files retain their originals. Review the private destination transfer journal. Browser copy requires a supported folder-writing browser; sorted ZIP download is available up to 400 MB, with a 600 MB input-file limit. Desktop sorting streams checksums and reads up to 4 MB of DICOM headers; it does not load whole scans into memory. Annotation limits are separate. Browser move is unavailable.

**Privacy intake** strips imported headers, gives cases neutral names, keeps the mapping in an encrypted reference vault, and scans every K slice with bundled local English OCR. Pixel masking can damage anatomy and OCR can miss text. Review the outcome and facial reconstruction risk before clearance. There is no fully automatic anonymity guarantee. Original sorted DICOM files and ordinary project backups remain private working material, not sanitized releases.

**Quality control & reviewers** reports label volume and optional second-rater overlap, and records primary/independent review. **Dataset rights & release** records provenance and usage permissions. **Export dataset** has internal-training and commercial-candidate modes, with anatomy/modality filtering, grouped splits, duplicate detection, checksums and a dataset card.

Read [PRIVACY-AND-RELEASE.md](PRIVACY-AND-RELEASE.md) for naming conventions, the private reference sheet, storage behavior, dataset rights gates and the professional release roadmap.

## Viewer and assistance

The viewer shows one voxel-axis plane at a time, with I, J and K plane selectors. It does not resample oblique data to cardinal anatomical planes or enforce a radiological left/right convention. RAS direction vectors identify the displayed axes. Original image geometry is retained for masks and landmarks. Unknown orientation is explicitly marked and must be resolved by the reviewer before laterality-dependent annotation.

- Brush / eraser: click and drag. Brush radius is measured in image pixels, not millimetres.
- Smart grow: click a seed; the preview follows connected pixels within the selected intensity tolerance.
- Threshold slice: preview pixels inside an intensity interval.
- Suggest next slice: copies the current label footprint where the next slice's intensity is consistent. It is a simple proposal, not anatomical tracking.
- AI box: drag around the target, then **Run connected AI model**.
- Landmarks: click to place; names must match project definitions when required.
- Mouse wheel: scroll slices; Ctrl+wheel: zoom; middle drag: pan; right drag: window/level.
- Shortcuts: B brush, E erase, S grow, L landmark, X AI box; Ctrl/Cmd+Z undo; Ctrl/Cmd+Y redo; Ctrl/Cmd+S backup; arrows change slice.
- Undo/redo retains up to 40 edits for the currently opened case. Undo history is not stored in backups. Accepted-assistance provenance is recorded.
- The overwrite toggle prevents suggestions or painting from replacing another nonzero label unless enabled. Erasing removes selected voxels.

### Trained AI assistance

Use **Set up local AI automatically** in the desktop app or local web launcher. It downloads an isolated runtime, model dependencies and trained weights, starts the local service, and manages connection settings for you. Draw an AI box, request a suggestion, then review it before accepting. First setup needs internet access and several GB of disk space; subsequent starts reuse verified files. The local grow, threshold and propagation tools still work without downloads.

See [Advanced workflows](ADVANCED-WORKFLOWS.md) for supported platforms, NanoPix/DICOM support, model limitations and external-server configuration.




A hosted HTTPS app may restrict connections to a local HTTP endpoint. Use the locally served app with a local model, or a model behind authenticated HTTPS for a remote workflow. For remote GPU access, put an authenticated TLS reverse proxy in front of the model server or forward it over an approved private network. The included model server deliberately binds to loopback.

The endpoint contract is:

```json
POST /segment
{"image":"base64 PNG without data prefix","width":512,"height":512,"box":[100,120,300,340],"label":1,"axis":2,"slice":30}
```

The response must use the exact input pixel dimensions and a flat row-major binary array:

```json
{"width":512,"height":512,"mask":[0,0,1],"model":"your-model-name"}
```

The example array is shortened; the real response must contain width × height entries, each 0 or 1. The request uses a windowed 2D image, not the full raw volume. Label codes do not magically define anatomy to the model; the box is the spatial prompt. API keys stay in memory for that request and are not saved in projects. Review and independent calibration remain necessary; AI output is a pre-label rather than automatic ground truth.

## GPT, Claude, DeepSeek and local chat models

Open **AI connections**. In the desktop app, choose a provider, enter a model ID enabled for your account and your API key, and save the connection. Enable images only if that exact model supports vision. Credentials stay in memory unless you explicitly select OS-encrypted persistence. OpenAI, Anthropic and DeepSeek adapters use their respective APIs. Compatible APIs support an HTTPS endpoint or a loopback local server. No API keys, subscriptions or inference credits are included.

The assistant helps with protocol interpretation, missing review steps and dataset documentation. It does not generate pixel masks; use the separate MedSAM connection for reviewed segmentation proposals. Inspect the context preview and approve each request. Adding a slice requires privacy clearance and explicit image selection. Replies are unverified research assistance; saving a reply does not mark a case reviewed.

For the browser version, run the included gateway on a trusted machine with Node.js 22 or later. Configure these environment variables before `node ai/gateway.cjs`:

| Variable | Value |
| --- | --- |
| `MEDANNOTATE_GATEWAY_TOKEN` | Random secret, at least 24 characters |
| `MEDANNOTATE_AI_PROVIDER` | `openai`, `anthropic`, `deepseek` or `compatible` |
| `MEDANNOTATE_AI_MODEL` | Exact model ID available to your account/server |
| `MEDANNOTATE_AI_KEY` | Provider key; optional only for a local compatible server |
| `MEDANNOTATE_AI_ENDPOINT` | Full chat-completions endpoint for `compatible` only |
| `MEDANNOTATE_AI_VISION` | `true` only for a verified vision-capable model |
| `MEDANNOTATE_ALLOWED_ORIGINS` | Comma-separated exact app origins |

The gateway binds to 127.0.0.1:8767. Enter its base URL and gateway token in the app. It authenticates requests, checks origins and requires explicit transmission approval. For a remote gateway, use your authenticated TLS infrastructure; it is not an included cloud service. A hosted HTTPS app may block loopback HTTP requests: use the locally served app or a trusted HTTPS gateway. Provider keys are never returned to the browser.

Provider integration references: [OpenAI Responses](https://developers.openai.com/api/docs/guides/text), [Anthropic Messages](https://platform.claude.com/docs/en/build-with-claude/working-with-messages), [DeepSeek API](https://api-docs.deepseek.com/). Live calls need your credentials and remain untested here.

### Optional MRI defacing installation

On a trusted machine with FSL available, install `ai/requirements-deface.txt`. Set `MEDANNOTATE_DEFACE_TOKEN` to a random secret of at least 24 characters and `MEDANNOTATE_ALLOWED_ORIGINS` to exact app origins. Run `python ai/deface_server.py`; it binds to `127.0.0.1:8768`. In Privacy intake, enter `http://127.0.0.1:8768/deface`, the token, and approve volume transmission. For the Electron file origin, explicitly allow `null` only on a token-protected loopback service. PyDeface/FSL is a separate deployment and requires your own validation; it is not bundled or automatically downloaded.

## Google Drive

**No developer setup:** use Google Drive for desktop, make the relevant folder available locally, and select it with **Open DICOM folder**, or download files from Drive then import. Save downloaded `.medannotate` project backups into that synced folder. Automatic background Drive writeback and multi-user editing are not implemented.

**Direct cloud import in the web/localhost version:** create a Google OAuth web client, enable the Drive API, configure the consent screen/test users as applicable, and add the exact app origin to authorized JavaScript origins. Enter its client ID in **Google Drive**. Read-only authorization is requested. Select a folder and all slices of a DICOM series together. The browser downloads the selected files using your temporary token. There is no shared app-owned OAuth identity; you must supply your own. Direct OAuth is unavailable from the Electron `file:` origin; use its synced-folder option.

Direct import shows 100 entries per page. Import a selection before changing pages. For a DICOM series spanning pages, use a synced/downloaded folder and import it all together instead. Nested folders are opened explicitly. Direct Google authentication has not been tested against a live user account here. See [Google's token model guide](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## Remote PCs

- Open the hosted web app on any authorized computer; use a portable project backup to move work. Its image processing occurs in that computer's browser. No shared patient-data database or remote filesystem browser is provided.
- To work with data that must remain on a particular remote PC, run the local app there and use your organization's approved remote desktop connection. Files and processing then remain on that PC.
- To self-host the interface, run `node serve.cjs` on a remote server and use an authenticated HTTPS reverse proxy, or forward its loopback port over SSH. The static app server itself provides no authentication and binds to loopback by default. This serves the UI; it does not turn the remote disk into an image browser.
- A separate remote GPU can run the optional MedSAM endpoint. Only explicitly approved slices are transmitted to it.

## Training export

```
segmentation/
  imagesTr/CASE_0001_0000.nii.gz
  labelsTr/CASE_0001.nii.gz
  imagesTs/...
  labelsTs/...
  dataset.json
  splits_final.json
landmarks/CASE_0001.mrk.json
classification.csv
bounding_boxes.json
provenance.json
label_definitions.json
case_manifest.json
quality_control.json
release_metadata.json
DATASET_CARD.md
LICENSE.txt
SHA256SUMS
splits.json
README.md
```

Masks are uint16 NIfTI-1 labelmaps, with geometry matching images. Landmarks use LPS millimetres in Slicer Markups JSON. Bounding boxes are derived automatically and use inclusive voxel IJK bounds. Classification rows refer to the same images via case IDs and include subject group and split. Images remain single-channel series; multi-sequence registration/channel assembly is not included. Export does not train a model. Quality control reports label volumes and, when a registered second-rater mask is supplied, Dice/IoU for the current revision. Independent release approval is recorded separately.

For nnU-Net v2, choose an unused ID (typically above 10), copy `segmentation` into your raw-data directory as `DatasetXXX_Name`, preprocess, then copy the exported `splits_final.json` into that dataset's preprocessed directory before training fold 0. Held-out test labels must not enter training. This follows the [nnU-Net dataset conventions](https://github.com/MIC-DKFZ/nnUNet/blob/master/documentation/dataset_format.md). Small cohorts may produce empty splits: inspect `splits.json` before training. Pixel spacing, masks and series consistency still require dataset-specific validation.

## Supported image scope and limits

- NIfTI-1 single-file `.nii` and `.nii.gz`: scalar 2D/3D integer or floating-point data, sform and qform, slope/intercept, endian handling, spatial unit conversion. Higher-dimensional input with non-singleton time/channel axes must be split first. NIfTI-2, paired `.hdr/.img`, vector and RGB NIfTI are unsupported.
- DICOM Part 10: monochrome, single-frame, native 8/16-bit pixels; explicit/implicit VR little endian and explicit VR big endian. Reads spatial orientation/position, spacing, stored-bit signed values and rescale. Rejects inconsistent orientations, duplicate positions and irregular gaps. Compressed JPEG/JPEG2000/RLE, enhanced multiframe and other unsupported transfer syntaxes must be converted to 3D NIfTI using a trusted DICOM converter first. Keep source files for conversion verification.
- PNG/JPEG: grayscale conversion with unknown anatomical orientation and nominal unit spacing. Intended as a basic 2D path; spatial measurements are not calibrated.
- Limits: 64 million voxels per volume, 128 million voxels per workspace, and 600 MB per input file. Memory use can be several times image size during backups/export. This release uses browser memory and IndexedDB rather than large-cohort streaming storage.
- Automatic header stripping, neutral naming and local English OCR are included. Privacy clearance remains a human review because OCR and recognizable anatomy can leave identifying information. The optional defacing service requires a separate installation. See PRIVACY-AND-RELEASE.md.

## Build and validation

`npm test` runs 35 automated regression tests without installing packages. See tests/VALIDATION.md for what was and was not verified. It covers NIfTI geometry/scaling/qform, mask data types, three-plane indexing, connected-region behavior, checksum-protected project backups, subject-group splits, derived boxes and DICOM pixel/geometry handling across all three supported transfer syntaxes.

The browser JavaScript is syntax-checked. Native Windows/macOS launches, live Google OAuth and real MedSAM inference require testing in their target environments. No clinical accuracy or agreement study has been performed. Perform your protocol's calibration and double-annotation checks before accepting a production dataset.

`npm install` then `npm run desktop:build` builds on your operating system using Electron Builder. The included `.github/workflows/desktop.yml` builds Windows x64, macOS Intel and Apple Silicon packages when manually triggered in a GitHub repository. Certificates/notarization credentials are not included. See [Electron Builder](https://www.electron.build/) for signing configuration.

Browser code has no runtime CDN dependency except Google sign-in, which loads only when requested. The bundled [dicom-parser](https://github.com/cornerstonejs/dicomParser) is MIT licensed; its license is included. Third-party Electron license files are retained in the desktop distributions.
