# MedAnnotate 1.4 workflows

## Built-in dental viewer

Use **Import images** for `.ioss`, native monochrome DICOM, NIfTI, PNG or JPEG. The image opens in MedAnnotate itself. Window/level, zoom, pan, slice navigation, brush, eraser, connected region grow, landmarks and mask review use the same canvas. Original files are never edited by importing.

NanoPix support was verified against one supplied 1500 × 1000 sample and synthetic fixtures. The reader supports the observed Zstandard-compressed FlatBuffers layout with two unsigned 16-bit pixel buffers. It uses the stored processed buffer, without trying to reproduce vendor filters or display transformations. Anatomy orientation and physical calibration are deliberately unknown. Other `.ioss` versions are not guaranteed: the viewer rejects unknown layouts, while the sorter preserves those originals under REVIEW/ORIGINAL_FILES.

**Organize scans** recognizes supported NanoPix metadata as DENTAL / IO, groups patients and series with keyed pseudonyms, copies the `.ioss` originals and verifies hashes. General intraoral metadata does not establish whether an image is periapical or bitewing. Sorting retains source metadata and is not de-identification.

Complete **Privacy intake** before editing or exporting a patient case. Run local OCR, inspect its result, and record the privacy review. Automatic text masking can damage anatomy; turn it off for a read-only scan when appropriate. A flagged case may need a separate approved redaction process.

**Export DICOM image** creates a derived Secondary Capture file from a single unsigned 16-bit image. Its source patient identifiers and annotations are excluded. Pixel data matches the current workspace image; prior privacy masking is included. This export does not claim patient-space orientation or calibrated measurements. It is not a DICOM SEG export or a reproduction of the original acquisition headers. The supplied NanoPix sample retained all 1,500,000 pixel values through a DICOM export/reimport test.

Native implicit/explicit little-endian and explicit big-endian monochrome DICOM are supported. Compressed JPEG/JPEG-LS/JPEG2000 and enhanced multiframe images still require conversion. They can be sorted without being viewable. These limits are preferable to silently displaying incorrectly decoded data.

## Automatic local trained-model setup

Choose **Set up local AI automatically → Prepare and start local AI**. First setup downloads a private Python runtime, CPU-compatible model dependencies, architecture and trained MedSAM v1 weights. Allow several GB of disk space and an internet connection. Later starts reuse downloads. Setup currently supports Apple Silicon, Windows x64 and Linux x64; Intel Mac users can use the external-server connection.

The local web launcher and packaged desktop app manage setup and process lifetime. A remotely hosted static webpage cannot install software on your computer. Use the local launcher or desktop build for this feature. Setup errors appear in the dialog; Stop cancels the operation and a later retry reuses verified files.

Draw an **AI box** around the target, then choose **Use local AI on this image**. The model needs this prompt. Accept or discard its yellow mask preview after checking it. A model's ability to return a mask does not establish dental accuracy. No validated tooth-numbering or automatic diagnosis model is included.

Managed setup generates its own session token and chooses a loopback port; users do not configure environment variables. Runtime archives, architecture archive and checkpoint downloads have pinned SHA-256 checks. Checkpoints load with `weights_only=True`. The service binds only to loopback; images are not sent to a cloud inference provider. Source-package caches live in `.local-ai`; desktop caches live in application data. Stopping the app stops its managed model service. Keep third-party licenses supplied with installed components.

Manual grow, threshold and next-slice propagation remain deterministic image-processing tools that work without model downloads.

## Segmentation studio and learning export

The separate **Segmentation studio** connects to a MONAI Label HTTP server. It discovers automatic 3D segmentation models and maps numeric output codes to project labels. Input volumes must have known spatial geometry; output dimensions and affine must match. Unmapped label codes, stale results and invalid voxels are rejected. A proposal remains a preview until accepted; undo is available. This is not an embedded MONAI training server.

A browser connection needs CORS permission for the exact local app origin; the desktop connection uses a restricted application bridge. HTTPS is required for remote servers. Tokens remain session-only. Canceling a client request does not guarantee server-side computation has stopped.

**Download learning dataset** exports reviewed, privacy-cleared images and corresponding labels/final masks. It does not start training, choose subject splits, or validate model quality. Configure those separately in your approved training environment.

## Open-source systems evaluated

| System | Relevant strength | Current decision |
|---|---|---|
| [MONAI Label](https://github.com/Project-MONAI/MONAILabel) | Model-serving and annotation/learning workflows | HTTP client and reviewed-data export integrated; external 3D server remains optional. |
| [MedSAM](https://github.com/bowang-lab/MedSAM) | Prompted 2D medical-image segmentation | Managed local installation and box-prompt adapter. No claim of dental validation. |
| [OHIF](https://github.com/OHIF/Viewers) | Full DICOM viewing platform and extensible workflows | Evaluated for broader future DICOM coverage. Not bundled in this release. |
| [ITK-Wasm](https://github.com/InsightSoftwareConsortium/ITK-Wasm) | Browser-capable image IO and spatial processing | Evaluated for additional codecs and volume formats. Not bundled in this release. |
| [fzstd](https://github.com/101arrowz/fzstd) | Small offline Zstandard decoder | Vendored under MIT for NanoPix import; license retained in dist. |

No single project is best for all medical modalities. Integration is limited to features that can be tested without implying that all upstream capabilities are present.
