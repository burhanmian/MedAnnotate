# Interface assets

The application remains framework-neutral and works offline. Selected Lumen Elements 4.3.0 components (Button, Badge, Card) are bundled into `dist/vendor/primitives.js`, with one stylesheet loaded before the MedAnnotate theme. No runtime CDN requests are needed. Native form controls and existing workflow dialogs retain their application behavior.

To rebuild: run `npm install --ignore-scripts` in this directory, then `npm run build`. Commit both generated assets. Preserve `dist/vendor/Lumen-LICENSE.txt` when distributing. The existing application and vendor license notices remain applicable.

The public interface uses MedAnnotate branding. Provider/model provenance remains in source and documentation, while model suggestions use a neutral description in the workspace.
