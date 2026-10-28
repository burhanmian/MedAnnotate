# MedAnnotate 1.2 — privacy and dataset release

A product of Mian Burhan Aftab.

## What is automatic

Imported DICOM is decoded into a canonical scalar image. Training exports write fresh NIfTI-1 headers containing dimensions, intensity values and spatial geometry, without carrying the original DICOM headers, NIfTI free-text fields or extensions. Newly imported cases receive neutral names. Patient ID/name, original source filenames, and DICOM study/series identifiers used for reference are separated into an encrypted internal vault.

The local privacy scan uses bundled Tesseract.js and its English model across every K slice. It can automatically replace detected text rectangles with the volume's minimum intensity. It never sends images to an OCR cloud service. It does not modify original source files. Masking is irreversible in the current working image: reimport the original to start again. Complete privacy preparation before drawing annotations.

This is assisted de-identification, not a guarantee of anonymity or a validated DICOM confidentiality-profile implementation. OCR can miss non-English, low-contrast, rotated, small or unusual text. It can falsely identify anatomy as text and remove that anatomy. A negative OCR result does not establish that identifiers are absent. Three-dimensional facial anatomy is a separate risk. A reviewer must inspect the result and record privacy clearance; the app blocks mask editing, image-based AI requests, completed review and training export until clearance.

The optional `ai/deface_server.py` connects PyDeface/FSL for MRI defacing. Install its dependencies on a trusted machine, configure its token and allowed origins, and explicitly approve volume transmission. FSL and a defacing engine are not bundled in the desktop application. Defacing results are rejected if dimensions or affine geometry change. This integration has not been exercised with FSL or real scans here; validate it on your acquisition types before relying on it.

## Neutral naming and the private sheet

| Item | Convention | Purpose |
| --- | --- | --- |
| New annotation case | `ECAR_A1B2C3D4_000001` | Eight-character project namespace plus six-digit sequence; no patient names or dates |
| Direct-import subject | `SUBJ_` plus random identifier | Keeps matching DICOM patient ID/issuer records together within the reference vault |
| Sorter subject | `P_` plus keyed digest | Stable within the project's private sorting key; verify missing or inconsistent source IDs |
| Sorted original | `ANATOMY/MODALITY/SUBJECT/ST_digest/SE_digest/I_checksum.dcm` | Deterministic organization of original files; headers still identify the source |
| Commercial case | `ECAR_000001` | Renumbered within each release |
| Segmentation image | `case_id_0000.nii.gz` | Single-channel nnU-Net image |
| Label mask | `case_id.nii.gz` | Matching integer labels and geometry |

The encrypted reference vault holds case ID, subject code, original name, patient ID/name, issuer, study/series UID, available source paths, and creation time. Browsers only expose selected relative paths or filenames; the desktop folder scan can retain full original paths. The app does not retain every original header field in this sheet.

Use a passphrase of at least 12 characters. AES-256-GCM encryption uses a random nonce and salt with PBKDF2-SHA256, 310,000 iterations. The key and decrypted records remain in application memory while unlocked. Download an encrypted `.medrefs` backup after imports and group changes, and keep the passphrase separately. There is no password recovery. Lock the vault when done. A CSV export is an explicit internal-only action and is **plaintext**, including original identifiers; formula-like values are escaped for spreadsheet use. Never distribute the CSV with a dataset.

Names are pseudonyms, not proof of anonymization. Deidentified NIfTI inputs lack a reliable patient key: manually assign the same neutral subject group to related series. Different hospitals can reuse IDs or omit issuers; check those groups. Keep all longitudinal and multi-sequence studies from one subject in one split. Exact duplicate canonical images are blocked during export, but near duplicates and differently reconstructed scans need review.

## Where private data lives

- Original and sorted files remain wherever you selected them. Sorting copies original bytes; it does not sanitize them.
- Images, masks and project autosave are held in this browser/Electron profile. **Image autosave and `.medannotate` project backups are not application-encrypted.** Use a protected workstation, encrypted disk, appropriate account access and approved backup storage. Pending images can contain identifying pixels.
- The reference vault is separately encrypted and is excluded from project and training exports. Back it up separately.
- The hosted app serves interface files; it has no patient-image upload/database endpoint. It is not a shared hospital image server. Google import contacts Google only when requested. A synced folder follows your configured Drive sync policy.
- Local OCR has no image upload. AI, MedSAM and defacing services receive data only through the explicitly requested connection. Inspect the prompt/context preview; do not put identifiers into free-text prompts, label names, reviewer IDs or dataset documentation.
- Desktop provider keys default to session-only. Optional key persistence requires OS-backed Electron safeStorage. Web keys belong in the authenticated gateway environment; the browser holds only a session gateway token.
- Sending data to an external AI provider is a disclosure to that provider. `store:false` on OpenAI Responses is not a promise of zero provider retention. Use your organization's approved provider configuration and terms. No automatic cloud fallback exists.

The local audit records are editable project data. They are not a tamper-evident or authenticated compliance audit trail. Reviewer IDs are self-reported; there is no role-based multi-user sign-in in this release.

## Release checklist implemented in the app

Internal training export requires confirmed label definitions, all acquisition checks, a valid subject group, complete classifications/landmarks, self-review, reviewed status, and privacy clearance. Synthetic cases are excluded. An empty mask needs explicit negative-case confirmation. Changes invalidate completed review and independent approval.

Commercial release candidates additionally require project license/provenance/intended-use fields, authorization references, per-case training/redistribution/commercial/de-identification declarations, and an independent reviewer different from the primary reviewer for the current annotation revision. These are recorded attestations, not an assessment that you own data or have permission to sell it. A rights holder and appropriate privacy/legal review must establish that independently.

Each dataset ZIP includes images, integer masks, classification rows, derived boxes, LPS landmarks, grouped splits, label definitions, QC metrics, review/assistance/privacy provenance, release documentation and a SHA-256 file manifest. Private source mappings, original headers, original file paths, project sorting secrets and AI conversations are excluded. Inspect human-authored text before distribution. Test labels stay held out from training. The app does not train models, host a marketplace, or determine commercial value.

## Professional release priorities

1. Validate de-identification on representative scanners, languages and acquisition protocols, including recognizable faces and OCR damage. Add a reviewed quarantine queue and an approved automated defacing engine deployment.
2. Add authenticated user roles, enforced independent review, immutable audit storage, managed encryption, backup/restore drills and controlled dataset access for organizational deployment.
3. Expand image interoperability: compressed/enhanced DICOM, DICOMweb/PACS, clinically validated orientation display, registration, multi-sequence channels and large-volume streaming. Keep the present explicit format rejections until replacements are verified.
4. Establish reader calibration, double annotation, adjudication, anatomy-specific agreement thresholds, external clinical evaluation and accessibility testing. Dice is a comparison metric, not proof of correct anatomy.
5. Sign/notarize native packages, run Windows/macOS installation and update QA, pin release dependencies, perform security review, and build documented release/recovery procedures.

## Primary references

- [DICOM PS3.15, confidentiality profiles](https://dicom.nema.org/medical/dicom/current/output/chtml/part15/chapter_E.html)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
- [PyDeface and FSL prerequisites](https://github.com/poldracklab/pydeface)
- [nnU-Net dataset format](https://github.com/MIC-DKFZ/nnUNet/blob/master/documentation/dataset_format.md)
- [BIDS specification](https://bids-specification.readthedocs.io/en/stable/)
- [OHIF DICOMweb integration](https://docs.ohif.org/configuration/datasources/dicom-web/)
