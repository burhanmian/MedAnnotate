// Keep the compact project menu keyboard accessible and dismiss it after actions.
'use strict';
const projectMenu=document.querySelector('.header-more');
projectMenu.addEventListener('click',event=>{if(event.target.closest('button'))projectMenu.open=false});
document.addEventListener('pointerdown',event=>{if(projectMenu.open&&!projectMenu.contains(event.target))projectMenu.open=false});
projectMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();projectMenu.open=false;projectMenu.querySelector('summary').focus()}});

// A plain-language project form; the original advanced editor remains available.
const advancedProjectSettings=$('settings').onclick;
bind('settings',()=>{
 modal(`<h2>Project settings</h2><p>Name your project and define what each label means. These settings apply to every image in this project.</p><label>Project name<input id="friendlyProjectName" maxlength="160" value="${esc(project.name)}"></label><h3>Annotation labels</h3><div class="settings-labels">${project.labels.map((l,i)=>`<fieldset><legend>Label ${l.value}</legend><div class="settings-label-row"><label>Label name<input data-label-name="${i}" maxlength="120" value="${esc(l.name)}"></label><label>Colour<input type="color" data-label-color="${i}" value="${esc(l.color)}"></label></div><label>What to include and exclude<textarea data-label-definition="${i}" rows="2" placeholder="Describe the structure and its boundaries">${esc(l.definition||'')}</textarea></label></fieldset>`).join('')}</div><label class="check"><input id="friendlyConfirmed" type="checkbox" ${project.targetsConfirmed?'checked':''}>These label names and boundary definitions have been agreed with my reviewer.</label><p class="hint">Changing settings returns reviewed cases to draft so the updated definitions can be checked.</p><button id="friendlySave" class="primary wide">Save settings</button><button id="advancedSettings" class="wide">Advanced configuration</button>`);
 bind('advancedSettings',()=>advancedProjectSettings());
 bind('friendlySave',()=>{
  const config={...project,name:$('friendlyProjectName').value.trim(),targetsConfirmed:$('friendlyConfirmed').checked,labels:project.labels.map((l,i)=>({...l,name:document.querySelector(`[data-label-name="${i}"]`).value.trim(),color:document.querySelector(`[data-label-color="${i}"]`).value,definition:document.querySelector(`[data-label-definition="${i}"]`).value.trim()}))};
  validateSettings(config);C.check(new Set(config.labels.map(l=>l.name.toLowerCase())).size===config.labels.length,'Give each label a different name.');
  if(config.targetsConfirmed)C.check(config.labels.every(l=>l.definition),'Add a boundary definition for each confirmed label.');
  project=config;project.cases.forEach(c=>{invalidate(c);c.selfReview=false});changed();renderAll();$('dialog').close();message('Project settings saved. Your existing images and annotations are kept.');
 });
});
bind('editLabels',()=>$('settings').click());
bind('emptyImport',()=>$('import').click());
bind('help',()=>modal(`<h2>Getting started</h2><ol class="help-steps"><li><strong>Import or organize.</strong> Choose Import images to open scans. For a mixed folder, choose Organize scans to review groups and save organized copies; originals stay in place.</li><li><strong>Complete privacy intake.</strong> Imported images need a privacy check before annotation. The private vault keeps original identifiers separate; keep its passphrase and encrypted backup safe.</li><li><strong>Name your labels.</strong> Choose Edit labels to define each structure and its boundaries.</li><li><strong>Annotate and review.</strong> Draw with Brush, remove with Erase, or preview Smart grow and Threshold suggestions. Accept or discard each suggestion. Use Review when finished.</li><li><strong>Save your work.</strong> Save project downloads a portable backup with images and annotations. Open project restores it. Export dataset is for reviewed, non-practice cases.</li></ol><h3>Viewer controls</h3><p>Scroll over the image to change slices. Control + scroll zooms. Drag with the right mouse button to adjust brightness and contrast; drag with the middle button to pan. Undo and Redo apply to annotation edits in the current case.</p><p><strong>Keyboard:</strong> Command/Ctrl + S saves a backup. Command/Ctrl + Z undoes an annotation; Shift + Command/Ctrl + Z redoes it. Shortcuts do not interfere with typing in fields.</p><p class="hint">Trained AI is optional. Automatic setup needs the desktop app or local launcher. Native monochrome DICOM, NIfTI, the supported NanoPix format, PNG and JPEG can be opened; other formats may require conversion.</p>`));

// One relevant next action, rather than a forced onboarding tour.
function updateGuidance(){
 const c=current();let title,detail,action;
 if(!c){title='Start with your images';detail='Import scans, organize a mixed folder, or try a practice image.';action='import'}
 else if(!c.synthetic&&c.privacy?.state!=='approved'){title='Next: check image privacy';detail='Review identifying text and image content before annotating.';action='privacy'}
 else if(!c.synthetic&&!project.targetsConfirmed){title='Next: define your labels';detail='Name the structures and agree their boundaries before review.';action='settings'}
 else if(c.status==='reviewed'){title='Reviewed and ready';detail='Save a project backup or export your reviewed dataset.';action='save'}
 else{title=c.synthetic?'Practice workspace':'Ready to annotate';detail=c.synthetic?'Try a tool, then Undo. Practice images are excluded from datasets.':'Choose a label and draw. Open Review when the annotation is complete.';action='review'}
 $('nextTitle').textContent=title;$('nextDetail').textContent=detail;
 const button=$('nextAction');button.textContent=({import:'Import images',privacy:'Check privacy',settings:'Edit labels',save:'Save project',review:'Open review'})[action];button.onclick=()=>action==='review'?document.querySelector('[data-panel="review"]').click():$(action).click();
 document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
 $('count').textContent=project.cases.length+(project.cases.length===1?' case':' cases');
}
const shellRenderDetails=renderCaseDetails;
renderCaseDetails=function(){shellRenderDetails();updateGuidance()};
const shellRenderAll=renderAll;
renderAll=function(){shellRenderAll();updateGuidance()};
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',updateGuidance));
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.altKey||!(event.metaKey||event.ctrlKey)||$('dialog').open)return;
 if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const key=event.key.toLowerCase();
 if(key==='s'){event.preventDefault();$('save').click()}
 else if(key==='z'&&current()){event.preventDefault();$(event.shiftKey?'redo':'undo').click()}
});
updateGuidance();
