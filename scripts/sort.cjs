#!/usr/bin/env node
// Local batch organizer. Dry-run unless --copy is explicitly supplied.
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const Files=require('../desktop/file-operations.cjs'),Sort=require('../dist/sorter.js');
async function main(){
 const args=process.argv.slice(2),copy=args.includes('--copy'),pos=args.filter(a=>a!=='--copy');
 if(pos.length!==2||pos.some(a=>a.startsWith('--'))){console.log('Usage: node scripts/sort.cjs SOURCE DESTINATION [--copy]\nWithout --copy, scans and previews only. Destination must be separate from source.');process.exitCode=2;return}
 const source=await fs.realpath(pos[0]),destination=path.resolve(pos[1]);
 let resolvedDestination;try{resolvedDestination=await fs.realpath(destination)}catch(e){if(e.code!=='ENOENT')throw e;resolvedDestination=path.join(await fs.realpath(path.dirname(destination)),path.basename(destination))}
 if(source===resolvedDestination||Files.below(source,resolvedDestination)||Files.below(resolvedDestination,source))throw Error('Use separate, non-nested source and destination folders');
 const keyPath=path.join(resolvedDestination,'.medannotate-sort-key');let secret;
 try{const st=await fs.lstat(keyPath);if(!st.isFile()||st.isSymbolicLink())throw Error('Sorting key must be a regular file');secret=(await fs.readFile(keyPath,'utf8')).trim()}catch(e){if(e.code!=='ENOENT')throw e;secret=crypto.randomBytes(32).toString('hex')}
 const plan=await Files.scan(source,secret),decisions=Sort.automaticDecisions(plan.rows),counts={};
 for(const d of decisions){const row=plan.rows.find(r=>r.id===d.id),key=row.format==='FILE'?'REVIEW/ORIGINAL_FILES':d.category+'/'+row.modality;counts[key]=(counts[key]||0)+row.files.length}
 console.log(JSON.stringify({mode:copy?'copy':'preview',files:plan.files,groups:plan.rows.length,folders:counts,skipped:plan.skipped.length},null,2));
 if(!copy){console.log('Preview only; no files were changed. Run again with --copy to organize.');return}
 await fs.mkdir(resolvedDestination,{recursive:true});try{await fs.writeFile(keyPath,secret+'\n',{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e;if((await fs.readFile(keyPath,'utf8')).trim()!==secret)throw Error('Sorting key changed; retry')}
 const journal=await Files.execute(plan,resolvedDestination,[],{automatic:true});const failures=journal.files.filter(f=>f.status==='failed-original-retained');
 console.log('Copy complete. Originals retained. Failed: '+failures.length+'. Skipped: '+plan.skipped.length+'. Review the destination journal.');if(failures.length||plan.skipped.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
