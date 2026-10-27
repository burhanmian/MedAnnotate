# MedAnnotate 1.4 validation

Checked locally on Apple Silicon, 26 October 2026.

- All 45 automated tests passed in GitHub Actions on Linux, Windows and macOS for commit 2cb7ae5. Subsequent interface verification found unsupported native prompt dialogs in the embedded viewer; threshold and landmark entry were changed to in-app forms. Their preview/accept, undo/redo, landmark save and portable project backup workflows were then exercised successfully in the browser.
- Static browser scripts were syntax checked and every script referenced by index.html was verified present.
- The supplied NanoPix sample opened in the actual browser canvas at 1500 × 1000. It decoded into 1,500,000 unsigned 16-bit samples. DICOM export/reimport preserved every pixel value with zero mismatches. The original file was not changed or published.
- Synthetic NanoPix tests cover decoding, malformed inputs, oversize rejection, DICOM conversion without source identifiers, automatic dental folder organization, verified copy and reopening from the sorting plan.
- Existing tests cover DICOM byte orders, CT rescale, NIfTI geometry, mask export, ZIP integrity, region growing, subject-group splits, privacy encryption/redaction, copy collisions, symlink handling, move verification, provider adapters and desktop origin checks.
- Segmentation studio was tested against a real local HTTP fixture implementing model discovery and multipart image inference. Returned gzip NIfTI masks were checked for geometry, class mapping and voxel validity. This fixture is not a trained MONAI model; trained MONAI checkpoint inference remains unverified.
- Automatic local-model setup successfully downloaded its runtime, created a private Python 3.11 environment, installed model dependencies and architecture, verified the MedSAM checkpoint, and started the actual trained model. Its authenticated health endpoint returned ready. The subsequent patient-image inference test was not executed because automatic approval review hit an account usage limit. Successful startup does not establish segmentation accuracy.
- Native installers are built by GitHub Actions. A successful build is not equivalent to interactive launch testing on every operating system. Automatic model installation was exercised on Apple Silicon only.

## Limits

This is research annotation software, not a diagnostic device. Not every medical file format or DICOM transfer syntax is viewable. The current NanoPix decoder covers the observed layout, not a published universal vendor specification. Unknown files retain their original hierarchy during sorting. Compressed/enhanced DICOM needs conversion. Exact support limits and setup requirements are in ADVANCED-WORKFLOWS.md.

Model training, external chat-provider accounts, Google Drive OAuth setup, external defacing infrastructure and dental model quality are not certified by these tests. Patient examples, generated patient DICOM files, private references, tokens and model weights are excluded from the public repository and web deployment.

## Interface update and follow-up validation — 2026-10-27

- Replaced accumulated theme overrides with a responsive semantic-token theme; light controls surround a dark medical-image canvas. Added locally bundled Button, Badge and Card primitives, keyboard focus and a skip link. No CDN scripts are used.
- Browser checks: restored existing annotations and landmark, keyboard Enter opens dataset export, sorting dialog opens, Review panel remains reachable, threshold preview works, and accepting a no-op suggestion closes its preview. No browser error logs on this test page.
- Fixed stale suggestion controls after no-op acceptance; accept/discard/undo/redo now announce their actual outcomes. User-facing suggestion descriptions use neutral MedAnnotate wording; required licenses and provenance remain in the repository.
- All 45 Node tests pass with local loopback access. The restricted sandbox's initial EPERM listener errors were environmental; rerunning with local server permission passed.
- The earlier inference restriction is resolved: the installed trained model processed a synthetic 128 × 128 image in 7.1 seconds, returned 16,384 binary mask values with 5,127 foreground pixels, and matched the requested dimensions. This is execution/contract validation, not a clinical accuracy assessment.
