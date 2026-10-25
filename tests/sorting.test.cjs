const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const S=require('../dist/sorter.js'),F=require('../desktop/file-operations.cjs'),dcm=require('./fixtures/dicom.cjs');
test('dental categories distinguish explicit subtypes without guessing PA or BW',()=>{
 for(const [text,category] of [['IOPA','DENTAL_PERIAPICAL'],['periapical','DENTAL_PERIAPICAL'],['Bite-wing','DENTAL_BITEWING'],['OPG','DENTAL_PANORAMIC'],['lateral ceph','DENTAL_CEPHALOMETRIC'],['dental CBCT','DENTAL_CBCT'],['intraoral','DENTAL']])assert.equal(S.classify({seriesDescription:text}).category,category);
 assert.equal(S.classify({seriesDescription:'PA chest'}).category,'CHEST');assert.equal(S.classify({seriesDescription:'PA'}).category,'REVIEW');assert.equal(S.classify({seriesDescription:'Bitewing and periapical'}).category,'REVIEW');
});
test('broader body regions and contradictory metadata stay explicit',()=>{
 for(const [text,cat] of [['breast','BREAST'],['coronary heart','CARDIAC'],['wrist','WRIST'],['forearm','FOREARM'],['hip','HIP'],['foot','FOOT'],['whole body','WHOLE_BODY']])assert.equal(S.classify({bodyPart:text}).category,cat);
 assert.equal(S.classify({bodyPart:'BRAIN',seriesDescription:'knee'}).category,'REVIEW');assert.equal(S.automaticDecisions([{id:'x',...S.classify({},'periapical.jpg')}])[0].category,'REVIEW');
});
test('dental IO and compressed DICOM sort independently of viewer support',()=>{
 const meta=S.metadata(dcm(), 'file.dcm');assert.equal(meta.modality,'IO');assert.equal(meta.annotationCandidate,false);assert.equal(S.classify(meta).category,'DENTAL_PERIAPICAL');
 const compressed=S.metadata(dcm({syntax:'1.2.840.10008.1.2.4.90'}),'no-extension');assert.equal(compressed.format,'DICOM');assert.equal(compressed.annotationCandidate,false);
});
test('series keys do not merge reused UIDs across subjects or studies',()=>{
 const a=S.metadata(dcm(),'a');const b={...a,subject:'different'};assert.notEqual(S.recordKey(a,'',''),S.recordKey(b,'',''));assert.notEqual(S.recordKey(a,'',''),S.recordKey({...a,study:'different'},'',''));
});
test('opaque file paths reject traversal and nonportable names',()=>{
 for(const relative of ['../x','/x','a/../x','a/CON.txt','a/x:stream','a/evil.'])assert.throws(()=>S.safeRelative(relative));assert.equal(S.safeRelative('scan/model.obj'),'scan/model.obj');
});
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'medannotate-broad-'));const source=path.join(root,'source'),dest=path.join(root,'dest');await fs.mkdir(source);await fs.mkdir(dest);return {root,source,dest}}
test('automatic mixed-folder copy preserves dental, conflicts, sidecars and all original bytes',async()=>{const f=await fixture();try{
 const files={'dental.dcm':dcm(),'bitewing.dcm':dcm({description:'Bitewing',series:'1.2.3.5'}),'conflict.dcm':dcm({description:'BRAIN KNEE',bodyPart:'',series:'1.2.3.6'}),'model/scan.mhd':Buffer.from('ElementDataFile = scan.raw'),'model/scan.raw':Buffer.from([0,1,2]),'model/copy.raw':Buffer.from([0,1,2]),'notes.pdf':Buffer.from('%PDF synthetic')};
 for(const [name,data] of Object.entries(files)){await fs.mkdir(path.dirname(path.join(f.source,name)),{recursive:true});await fs.writeFile(path.join(f.source,name),data)}
 const plan=await F.scan(f.source,'a'.repeat(64));assert.equal(plan.skipped.length,0);const journal=await F.execute(plan,f.dest,[],{automatic:true});assert.equal(journal.files.length,7);assert.equal(journal.files.filter(x=>x.status==='copied-and-verified').length,7);assert.ok(journal.files.some(x=>x.destination.startsWith('DENTAL_PERIAPICAL/IO/')));assert.ok(journal.files.some(x=>x.destination.startsWith('DENTAL_BITEWING/IO/')));assert.ok(journal.files.some(x=>x.destination.startsWith('REVIEW/IO/')));
 for(const item of journal.files){assert.equal(await F.digest(path.join(f.dest,item.destination)),item.sha256);assert.equal(await F.digest(item.source),item.sha256)}
 assert.equal(await fs.readFile(path.join(f.dest,'REVIEW/ORIGINAL_FILES/model/scan.mhd'),'utf8'),'ElementDataFile = scan.raw');await assert.rejects(F.execute(plan,f.dest,[],{automatic:true,move:true}),/copy-only/);
}finally{await fs.rm(f.root,{recursive:true,force:true})}});
test('invalid selections do not create a destination journal',async()=>{const f=await fixture();try{const plan=await F.scan(f.source,'a'.repeat(64));await assert.rejects(F.execute(plan,f.dest,[{id:'unknown',category:'BRAIN',group:'X',confirmed:true}]),/Invalid series/);assert.deepEqual(await fs.readdir(f.dest),[])}finally{await fs.rm(f.root,{recursive:true,force:true})}});
