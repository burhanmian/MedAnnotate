/* Shared metadata sorter. Classification is evidence from text, never pixel diagnosis. */
(function(root){
'use strict';
const patterns={
 DENTAL_PERIAPICAL:/\b(peri[ -]?apical|iopa|intraoral periapical)\b/i,
 DENTAL_BITEWING:/\b(bite[ -]?wing|bwx)\b/i,
 DENTAL_PANORAMIC:/\b(panoram\w*|orthopantom\w*|opg)\b/i,
 DENTAL_CEPHALOMETRIC:/\b(cephalom\w*|ceph)\b/i,
 DENTAL_CBCT:/\b(cbct|cone[ -]?beam)\b/i,
 DENTAL:/\b(dental|tooth|teeth|dentition|intra[ -]?oral|mandible|mandibular|maxilla|maxillary|jaw)\b/i,
 BRAIN:/\b(brain|cerebr\w*|intracranial|cranial)\b/i,
 SPINE:/\b(spine|spinal|cervical|thoracic|lumbar|lumbosacral|[ctl][ -]?spine|sacrum|coccyx)\b/i,
 HEAD_NECK:/\b(head|neck|orbit|sinus|face|skull|thyroid|parotid)\b/i,
 CHEST:/\b(chest|lung|thorax|pulmonary|rib|ribs|sternum)\b/i,
 CARDIAC:/\b(cardiac|heart|coronary|echocardi\w*)\b/i,
 BREAST:/\b(breast|mammo\w*)\b/i,
 ABDOMEN_PELVIS:/\b(abdomen|abdominal|pelvis|pelvic|liver|kidney|renal|prostate|uterus|ovary|ovarian|pancreas|spleen|bladder|bowel|colon)\b/i,
 SHOULDER:/\b(shoulder|clavicle|scapula)\b/i, UPPER_ARM:/\b(humerus|upper arm)\b/i,
 ELBOW:/\belbow\b/i, FOREARM:/\b(forearm|radius|ulna)\b/i,
 WRIST:/\bwrist\b/i, HAND:/\b(hand|finger|thumb)\b/i,
 HIP:/\bhip\b/i, THIGH:/\b(femur|thigh)\b/i, KNEE:/\b(knee|patella)\b/i,
 LOWER_LEG:/\b(tibia|fibula|lower leg)\b/i, ANKLE:/\bankle\b/i, FOOT:/\b(foot|feet|toe|toes|calcaneus)\b/i,
 WHOLE_BODY:/\b(whole[ -]?body|total[ -]?body)\b/i
};
const categories=[...Object.keys(patterns),'OTHER','REVIEW'];
function hits(text){const value=String(text||'').replace(/[_/\\.-]+/g,' ');return Object.entries(patterns).filter(([,rx])=>rx.test(value)).map(([k])=>k)}
function resolve(values){const found=new Set(values);if(found.has('BRAIN'))found.delete('HEAD_NECK');if([...found].some(k=>k.startsWith('DENTAL_')))found.delete('DENTAL');if([...found].some(k=>k.startsWith('DENTAL')))found.delete('HEAD_NECK');if(found.has('CARDIAC'))found.delete('CHEST');return [...found]}
function classify(meta,path=''){
 const fields=[['Body part',meta.bodyPart],['Study description',meta.studyDescription],['Series description',meta.seriesDescription],['Protocol',meta.protocol]];
 const evidence=fields.flatMap(([field,text])=>hits(text).map(category=>({field,category}))),found=resolve(evidence.map(e=>e.category));
 if(found.length===1)return {category:found[0],confidence:'metadata suggestion',evidence:evidence.map(e=>e.field+': '+e.category).join('; ')};
 if(found.length>1)return {category:'REVIEW',confidence:'conflicting metadata',evidence:found.join(' / ')};
 const hints=resolve(hits(path));
 return hints.length===1?{category:hints[0],confidence:'path hint — verify',evidence:'Folder/file name only; anatomy not verified'}:{category:'REVIEW',confidence:'unresolved',evidence:hints.length?'Conflicting folder hints':'No recognized anatomy metadata'};
}
function metadata(bytes,name){
 const parser=root.dicomParser||(typeof require!=='undefined'?require('./dicomParser.min.js'):null),u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(u.length>=132&&String.fromCharCode(...u.slice(128,132))==='DICM'){
  const d=parser.parseDicom(u,{untilTag:'x7fe00010'}),s=tag=>(d.string('x'+tag)||'').trim(),modality=s('00080060'),syntax=s('00020010');
  const viewable=['1.2.840.10008.1.2','1.2.840.10008.1.2.1','1.2.840.10008.1.2.2'].includes(syntax)&&(s('00280008')||'1')==='1'&&(['IO','PX','DX','CR','MG'].includes(modality)||s('00080016')==='1.2.840.10008.5.1.4.1.1.7'||(!!s('00200032')&&!!s('00200037')&&!!s('00280030')))&&d.uint16('x00280002')===1&&['MONOCHROME1','MONOCHROME2'].includes(s('00280004'))&&[8,16].includes(d.uint16('x00280100'));
  return {format:'DICOM',modality:/^[A-Z0-9_]{1,16}$/.test(modality)?modality:'UNKNOWN',bodyPart:s('00180015'),studyDescription:s('00081030'),seriesDescription:s('0008103e'),protocol:s('00181030'),series:s('0020000e'),study:s('0020000d'),instance:s('00080018'),subject:s('00100020')?'patient:'+s('00100021')+'|'+s('00100020'):'',transferSyntax:syntax,burnedIn:s('00280301')||'UNKNOWN',annotationCandidate:viewable,sortOnlyReason:viewable?'':'Sorting only: compressed/multiframe/non-spatial DICOM may need conversion for annotation'};
 }
 if(/\.ioss$/i.test(name)){try{return (root.MedIoss||(typeof require!=='undefined'?require('./ioss.js'):null)).metadata(u)}catch{return {format:'FILE',modality:'UNKNOWN',annotationCandidate:false,sortOnlyReason:'Unrecognized or damaged NanoPix image; original preserved. Export DICOM from NanoPix to open it.'}}}
 if(/\.nii(\.gz)?$/i.test(name))return {format:'NIFTI',modality:'UNKNOWN',annotationCandidate:true};
 if(/\.(png|jpe?g)$/i.test(name))return {format:'IMAGE',modality:'UNKNOWN',annotationCandidate:true};
 // Unknown and linked formats are kept together, with their original relative paths.
 // Renaming .mhd/.raw, .hdr/.img, .obj/.mtl, or slide sidecars can break references.
 return {format:'FILE',modality:'UNKNOWN',annotationCandidate:false,sortOnlyReason:'Preserved original folder structure; this format is not available in the annotation viewer'};
}
function safeName(s){if(!/^[A-Za-z0-9_-]{1,64}$/.test(String(s)))throw Error('Use 1–64 letters, numbers, hyphens or underscores for a subject group');return s}
function safeRelative(s){const parts=String(s||'').replace(/\\/g,'/').split('/');if(parts.some(p=>!p||p==='.'||p==='..'||/[\x00-\x1f<>:"|?*]/.test(p)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p)))throw Error('Source path is not portable; rename it before sorting');return parts.join('/')}
function destination(row,file){
 if(row.format==='FILE')return 'REVIEW/ORIGINAL_FILES/'+safeRelative(file.relative);
 if(!categories.includes(row.category))throw Error('Invalid anatomy category');
 const modality=/^[A-Z0-9_]{1,16}$/.test(row.modality)?row.modality:'UNKNOWN';
 if(!/^[a-f0-9]{20}$/.test(row.studyKey)||!/^[a-f0-9]{20}$/.test(row.id)||!/^[a-f0-9]{64}$/.test(file.hash)||!/^\.[a-z0-9.]+$/.test(file.extension))throw Error('Invalid sorting identifiers');
 return [row.category,modality,safeName(row.group),'ST_'+row.studyKey,'SE_'+row.id,'I_'+file.hash.slice(0,24)+file.extension].join('/');
}
function recordKey(meta,hash,relative){return meta.format==='FILE'?'path:'+relative:meta.series?'series:'+meta.subject+'|'+meta.study+'|'+meta.series+'|'+meta.modality:'file:'+hash}
function automaticDecisions(rows){return rows.map(r=>({id:r.id,category:r.confidence==='metadata suggestion'&&r.format!=='FILE'?r.category:'REVIEW',group:r.group,confirmed:false,automatic:true}))}
function mergeRecord(rows,record){let row=rows.find(r=>r.id===record.rowId);if(!row){row={id:record.rowId,studyKey:record.studyKey,group:record.group,modality:record.meta.modality,format:record.meta.format,description:record.meta.seriesDescription||record.meta.protocol||(record.meta.format==='FILE'?record.relative:record.meta.format),...record.suggestion,confirmed:false,files:[],subjectNeedsReview:!record.meta.subject,annotationCandidate:record.meta.annotationCandidate,sortOnlyReason:record.meta.sortOnlyReason||''};rows.push(row)}else{if(row.category!==record.suggestion.category){row.category='REVIEW';row.confidence='conflicting series evidence';row.evidence='Files within this series have different anatomy evidence'}if(!record.meta.annotationCandidate){row.annotationCandidate=false;row.sortOnlyReason=record.meta.sortOnlyReason}}row.files.push(record);return row}
const api={categories,classify,metadata,safeName,safeRelative,destination,recordKey,automaticDecisions,mergeRecord};root.MedSorter=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
