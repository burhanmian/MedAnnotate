/* MedAnnotate's independent client for the MONAI Label HTTP protocol. */
(function(root){
'use strict';
const MAX_BYTES=64*1024*1024,MAX_VOXELS=16000000;
function check(ok,message){if(!ok)throw Error(message)}
function config(input){
 const url=new URL(String(input?.url||''));
 check(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)),'Use HTTPS or a local loopback server');
 check(!url.username&&!url.password&&!url.search&&!url.hash,'Use a server address without embedded credentials, query or fragment');
 const token=String(input?.token||'');check(token.length<=8192&&!/[\r\n]/.test(token),'Invalid server token');
 return {url:url.href.replace(/\/+$/,''),token};
}
function modelList(info){
 check(info&&info.models&&typeof info.models==='object'&&!Array.isArray(info.models),'Server did not return a model catalog');
 return Object.entries(info.models).map(([id,m])=>{
  check(id.length>0&&id.length<=200&&!['.','..'].includes(id),'Invalid model identifier');
  const labels=m?.labels;const labelEntries=Array.isArray(labels)?labels.map((name,index)=>({name:String(name),value:index+(/^(background|bg)$/i.test(String(labels[0]))?0:1)})):Object.entries(labels||{}).map(([name,value])=>({name,value:Number(value)}));
  const validLabels=labelEntries.filter(l=>Number.isInteger(l.value)&&l.value>0&&l.value<=65535);
  return {id,type:String(m?.type||''),dimension:Number(m?.dimension),description:String(m?.description||'').slice(0,2000),labels:validLabels,supported:m?.type==='segmentation'&&Number(m?.dimension)===3};
 });
}
async function readLimited(response,limit){
 check(Number(response.headers.get('content-length')||0)<=limit,'Server response exceeds the size limit');
 const reader=response.body?.getReader();check(reader,'Server returned no data');const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;check(size<=limit,'Server response exceeds the size limit');chunks.push(value)}}catch(e){await reader.cancel().catch(()=>{});throw e}
 const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.length}return out;
}
async function request(connection,path,options,fetcher,signal,timeout){
 const c=config(connection),headers={...options.headers};if(c.token)headers.Authorization='Bearer '+c.token;
 let response;try{response=await fetcher(c.url+path,{...options,headers,redirect:'error',credentials:'omit',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)})}catch(e){if(signal?.aborted)throw Error('Request canceled');if(e.name==='TimeoutError'||e.name==='AbortError')throw Error('Server request timed out. Check server progress before retrying.');throw Error('Cannot reach the segmentation server. Check its address, connection and browser CORS settings.')}
 check(response.ok,response.status===401||response.status===403?'Server authentication failed. Check the access token.':'Segmentation server returned HTTP '+response.status);
 return response;
}
async function discover(connection,fetcher=fetch,signal){const response=await request(connection,'/info/',{method:'GET'},fetcher,signal,15000);const bytes=await readLimited(response,1024*1024);let data;try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('Server information was not valid JSON')}return {name:String(data.name||'Segmentation server'),models:modelList(data)};}
async function infer(connection,input,fetcher=fetch,signal){
 check(input?.consent===true,'Approve sending this volume before inference');check(input.privacyCleared===true,'Privacy clearance is required');
 check(typeof input.model==='string'&&input.model.length>0&&input.model.length<=200&&!['.','..'].includes(input.model),'Choose a model');
 const bytes=input.bytes instanceof Uint8Array?input.bytes:new Uint8Array(input.bytes||0);check(bytes.length>=352&&bytes.length<=MAX_BYTES,'Volume must be a NIfTI image smaller than 64 MB');
 const form=new FormData();form.append('params',JSON.stringify({result_extension:'.nii.gz',result_dtype:'uint16'}));form.append('file',new Blob([bytes],{type:'application/octet-stream'}),'volume.nii');
 const response=await request(connection,'/infer/'+encodeURIComponent(input.model)+'?output=image',{method:'POST',body:form},fetcher,signal,600000);
 return readLimited(response,MAX_BYTES);
}
async function decodeMask(bytes,core){
 let b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b[0]===31&&b[1]===139){const response=new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')));b=await readLimited(response,MAX_BYTES)}
 try{return core.nifti(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))}catch(e){throw Error('The server must return a scalar NIfTI labelmap. '+e.message)}
}
function mapMask(source,result,mapping,labels){
 check(source.data.length<=MAX_VOXELS,'Segmentation server limit is 16 million voxels');
 check(source.geometry!=='unknown'&&result.geometry!=='unknown','Known image geometry is required for volumetric inference');
 check(source.dims.every((n,i)=>n===result.dims[i]),'Server mask dimensions differ from this image; result rejected');
 check(source.affine.every((row,i)=>row.every((v,j)=>Number.isFinite(result.affine?.[i]?.[j])&&Math.abs(v-result.affine[i][j])<=1e-4*Math.max(1,Math.abs(v)))),'Server mask geometry differs from this image; result rejected');
 const allowed=new Set(labels.map(l=>l.value)),mapped=new Map();
 for(const [key,value] of Object.entries(mapping||{})){const from=Number(key),to=Number(value);check(Number.isInteger(from)&&from>0&&Number.isInteger(to)&&(to===0||allowed.has(to)),'Invalid label mapping');mapped.set(from,to)}
 check([...mapped.values()].some(x=>x>0),'Map at least one server label to a project label');
 const mask=new Uint16Array(result.data.length);let count=0;const counts={};
 for(let i=0;i<mask.length;i++){const v=result.data[i];check(Number.isInteger(v)&&v>=0&&v<=65535,'Server mask contains invalid label values');if(!v)continue;check(mapped.has(v),'Server returned unmapped label '+v+'; refresh the catalog and map all output labels');const to=mapped.get(v);if(to){mask[i]=to;count++;counts[to]=(counts[to]||0)+1}}
 check(count<=2000000,'Suggestion exceeds two million labeled voxels; use a smaller volume or fewer labels');
 return {mask,count,counts};
}
const api={config,modelList,discover,infer,readLimited,decodeMask,mapMask,MAX_BYTES,MAX_VOXELS};root.MedLabelClient=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
