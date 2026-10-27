const path=require('node:path');
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'primitives.js')],bundle:true,minify:true,format:'iife',target:'es2022',outfile:path.join(__dirname,'../dist/vendor/primitives.js'),legalComments:'eof'});
