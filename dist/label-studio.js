/* Segmentation workflow: connection secrets stay in this tab/session only. */
'use strict';
const LabelClient=MedLabelClient;
let labelConnection=null,labelCatalog=null,labelRequest=null;
function labelReady(c){C.check(c,'Open an image first');C.check(c.synthetic||c.privacy?.state==='approved','Complete Privacy intake before sending an image');C.check(c.geometry!=='unknown'&&c.dims[2]>1,'Automatic volume models require a 3D image with known geometry. Use manual tools or the slice-model connection for 2D X-rays.');C.check(c.data.length<=LabelClient.MAX_VOXELS,'This connection supports up to 16 million voxels per volume')}
function studioView(){
 modal(`<h2>Segmentation studio</h2><p>Connect your labeling server, choose a compatible model, and review a proposed mask before accepting it. Model suitability depends on its training anatomy and modality.</p><label>Server address<input id="labelURL" placeholder="http://127.0.0.1:8000" value="${esc(labelConnection?.url||'http://127.0.0.1:8000')}"></label><label>Access token (if required)<input id="labelToken" type="password" autocomplete="off"></label><div class="button-pair"><button id="labelConnect" class="primary">Test connection and load models</button><button id="labelForget">Disconnect</button></div><p id="labelConnectionStatus" role="status">${labelCatalog?'Connected: '+esc(labelCatalog.name):'No server connected. Model software and weights must be installed on your server.'}</p><div id="labelModels"></div><hr><h3>Learn from reviewed annotations</h3><p>Download reviewed, privacy-cleared images and labels for your model-training environment. This does not start training or upload your dataset.</p><button id="labelTrainingExport" class="wide">Download learning dataset</button>`);
 if(labelConnection)$('labelToken').value=labelConnection.token;
 bind('labelConnect',async()=>{
  C.check(!labelRequest,'Wait for or cancel the current request');const connection=LabelClient.config({url:$('labelURL').value,token:$('labelToken').value});
  labelConnection=null;labelCatalog=null;$('labelModels').replaceChildren();$('labelConnect').disabled=true;$('labelConnectionStatus').textContent='Checking the server…';
  try{const catalog=window.medDesktop?await medDesktop.labelInfo(connection):await LabelClient.discover(connection);labelConnection=connection;labelCatalog=catalog;if($('labelModels')){renderLabelModels();$('labelConnectionStatus').textContent='Connected: '+catalog.name+' · '+catalog.models.length+' model(s)'}}finally{if($('labelConnect'))$('labelConnect').disabled=false}
 });
 bind('labelForget',()=>{C.check(!labelRequest,'Cancel the current request first');labelConnection=null;labelCatalog=null;studioView()});
 bind('labelTrainingExport',exportLearningDataset);if(labelCatalog)renderLabelModels();
}
function renderLabelModels(){
 const models=labelCatalog.models.filter(m=>m.supported);$('labelModels').innerHTML=`<p>${models.length} automatic 3D model(s) available. Interactive, 2D, detection and classification models use different workflows and are not enabled here.</p>${models.length?`<label>Model<select id="labelModel">${models.map(m=>`<option value="${esc(m.id)}">${esc(m.id)}</option>`).join('')}</select></label><p id="labelDescription" class="hint"></p><div id="labelMapping"></div><label class="check"><input id="labelConsent" type="checkbox">I approve sending the entire current volume to this server and have checked that the model fits this anatomy and modality.</label><div class="button-pair"><button id="labelRun" class="primary">Generate volume suggestion</button><button id="labelCancel" disabled>Cancel request</button></div><p id="labelRunStatus" role="status"></p>`:'<p class="info-box">Load an automatic 3D segmentation model on your server, then reconnect. The existing slice-model and manual tools remain available.</p>'}`;
 if(!models.length)return;
 function mapping(){const m=models.find(m=>m.id===$('labelModel').value);$('labelDescription').textContent=m.description;$('labelConsent').checked=false;$('labelMapping').innerHTML=`<h3>Map model output to your project labels</h3><p class="hint">Background stays unchanged. Unselected structures are ignored. Confirm numeric output codes against your model configuration.</p>${m.labels.length?m.labels.map((l,i)=>`<div class="control-grid"><label>${esc(l.name)} · output code<input data-engine-code="${i}" type="number" min="1" max="65535" value="${l.value}"></label><label>Project label<select data-engine-target="${i}"><option value="0">Ignore this structure</option>${project.labels.map(p=>`<option value="${p.value}" ${p.name.toLowerCase()===l.name.toLowerCase()?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></div>`).join(''):'<p class="error">This model has no numeric label definitions. Configure its labels on the server before using it.</p>'}`;$('labelRun').disabled=!m.labels.length}
 $('labelModel').onchange=mapping;mapping();
 bind('labelCancel',()=>{if(labelRequest){labelRequest.controller.abort();if(window.medDesktop)void medDesktop.labelCancel();$('labelRunStatus').textContent='Cancel requested; the server may still finish its computation.'}});
 bind('labelRun',async()=>{
  C.check(!labelRequest,'A segmentation request is already running');const c=current();labelReady(c);C.check($('labelConsent').checked,'Approve the volume transmission first');
  C.check(LabelClient.config({url:$('labelURL').value,token:$('labelToken').value}).url===labelConnection.url&&$('labelToken').value===labelConnection.token,'Connection settings changed. Test the connection again.');
  const model=models.find(m=>m.id===$('labelModel').value),mapping=Object.create(null);
  for(const input of $('labelMapping').querySelectorAll('[data-engine-code]')){const code=Number(input.value);C.check(Number.isInteger(code)&&code>0&&code<=65535&&!Object.hasOwn(mapping,code),'Use unique positive model output codes');mapping[code]=Number($('labelMapping').querySelector(`[data-engine-target="${input.dataset.engineCode}"]`).value)}
  C.check(Object.values(mapping).some(v=>v>0),'Choose at least one project label');
  const connection={...labelConnection},caseRevision=c.annotationRevision||0,data=c.data,settings=JSON.stringify(project.labels),controller=new AbortController();labelRequest={controller};
  const controls=[...$('dialogBody').querySelectorAll('input,select,button')];controls.forEach(el=>el.disabled=true);$('labelCancel').disabled=false;$('labelRunStatus').textContent='Running model… this can take several minutes.';
  try{
   const request={bytes:C.writeNifti(c),model:model.id,consent:true,privacyCleared:true};
   const bytes=window.medDesktop?await medDesktop.labelInfer({connection,request}):await LabelClient.infer(connection,request,fetch,controller.signal);
   C.check(!controller.signal.aborted,'Request canceled');const result=await LabelClient.decodeMask(bytes,C);const proposed=LabelClient.mapMask(c,result,mapping,project.labels);
   C.check(current()===c&&c.data===data&&(c.annotationRevision||0)===caseRevision&&JSON.stringify(project.labels)===settings,'The image, labels or annotations changed during inference. Run a new suggestion.');labelReady(c);
   C.check(proposed.count>0,'The selected model labels returned an empty mask. No annotations were changed.');
   pending={...proposed,fullVolume:true,caseId:c.id,revision:caseRevision,source:'Trained volume suggestion',model:model.id};
   $('dialog').close();renderCaseDetails();draw();message('Volume suggestion ready. Inspect it across slices and planes, then accept or discard. Existing labels are protected unless overwrite is enabled.');
  }finally{labelRequest=null;controls.forEach(el=>el.disabled=false);if($('labelCancel'))$('labelCancel').disabled=true;}
 });
}
async function exportLearningDataset(){
 const cases=eligibleCases();C.check(cases.length,'Review at least one non-practice case, including privacy clearance, before exporting');
 C.check(cases.reduce((n,c)=>n+c.data.byteLength+c.mask.byteLength,0)<=400*1024*1024,'Use a smaller project: learning exports are limited to 400 MB before compression');
 C.check(new Set(project.labels.map(l=>l.name)).size===project.labels.length,'Project label names must be unique');
 const files={},manifest={schema:1,created:new Date().toISOString(),labels:Object.fromEntries(project.labels.map(l=>[l.name,l.value])),cases:[]};
 for(const c of cases){files[c.id+'.nii.gz']=await gzip(C.writeNifti(c));files['labels/final/'+c.id+'.nii.gz']=await gzip(C.writeNifti(c,c.mask,true));manifest.cases.push({id:c.id,group:c.group,revision:c.annotationRevision||0,modality:c.modality})}
 files['learning-manifest.json']=JSON.stringify(manifest,null,2);files['README.txt']='Reviewed research images with matching labels/final masks. Verify model anatomy, modality, numeric label configuration, subject splits and data-use permissions before training. No training job has been started.\n';
 download(C.zip(files),'MedAnnotate-learning-dataset.zip');audit('learning-dataset-export',{cases:cases.length});message('Learning dataset downloaded. Configure training separately in your approved model environment.');
}
bind('labelServer',studioView);
