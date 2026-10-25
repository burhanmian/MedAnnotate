# MedAnnotate 1.3 verification — 25 October 2026

- All 35 Node tests pass locally, including actual authenticated loopback gateway tests with mocked upstream AI.
- Added synthetic dental IO, compressed-transfer-syntax metadata, body-region classification, conflicting metadata, UID reuse, linked-file preservation, automatic copy and invalid-selection tests.
- Fixed duplicate handling: skip only after a matching destination copy succeeds; a valid duplicate can recover from a changed/failed first source.
- In the local browser, selected a six-file synthetic mixed folder. Periapical, bitewing and brain groups were shown; uncertain DICOM and linked MHD/RAW files went to review. Downloaded the automatic sorted ZIP, read all six entries and independently verified every SHA-256 checksum. Browser console had no errors in this flow.
- Original source bytes and destination copies are verified in filesystem integration tests. Native OS file pickers/trash/keychain and signed installers are not covered by the browser test.
- No real patient files were supplied. Anatomical classification accuracy across vendors/languages is not established. Metadata parsing does not prove that the image matches its description.
- Live third-party AI, Google OAuth, model inference, defacing and clinical validity remain unverified.

## Previous release record

# MedAnnotate 1.2 validation record — 9 September 2026

28 automated Node regression tests pass (`npm test`), using synthetic data and mocked external services:

- NIfTI geometry/scaling/qform, integer mask roundtrips, three-plane indexing, region grow, project ZIP corruption detection and grouped splits.
- Native monochrome DICOM pixel/geometry handling for the three supported uncompressed transfer syntaxes.
- Metadata sorting confidence/conflicts, exact duplicates, verified copy, copy-verify-trash behavior with a mocked trash operation, changed-source rejection, symlink rejection and no-overwrite collisions.
- Label physical volumes, registered second-rater Dice/IoU and current-revision commercial release gates.
- Provider request schemas and response/error handling with synthetic replies; desktop IPC authorization and credential-return restrictions.
- Actual loopback HTTP gateway authentication, origin filtering and consent enforcement; upstream provider calls mocked.
- AES-GCM reference encryption/decryption, fresh nonces, wrong-password/tampering rejection, OCR-box parsing, bounded redaction, annotation-before-redaction rejection, fresh headers without source text/extensions, and spreadsheet formula escaping.

The bundled English OCR model was exercised with Tesseract.js 6.0.1 in a Node worker on a generated image reading “SYNTHETIC PERSON TEST 12345.” Recognition succeeded and four text boxes were returned. This verifies an engine/model fixture, not performance on medical images or the browser/Electron worker launch.

All first-party JavaScript syntax and Python adapter syntax were checked. No browser visual, canvas/pointer or end-to-end GUI test was performed for this update. The obsolete v1 interface harness has been removed; its earlier result does not validate the new privacy/sorting interface.

Windows x64 and macOS Intel/Apple Silicon runtime ZIPs are checked against official Electron 40.0.0 SHA-256 values during packaging. ZIP contents retain runtime attributes and include the app, local OCR assets and adapters. Windows/macOS native launches, operating-system trash behavior, safeStorage keychain behavior, installation and signing/notarization are not verified on target systems here. These are unsigned portable application bundles, not certified installers.

Live GPT/Claude/DeepSeek requests, Google OAuth/import, real MedSAM checkpoint inference and PyDeface/FSL defacing were not tested. They need your configured accounts/models or separate runtime. No real patient dataset was provided. No de-identification accuracy study, clinical evaluation, legal assessment or commercial dataset certification was performed.
