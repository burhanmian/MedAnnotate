const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('medDesktop',Object.freeze({
  scanFolders:secret=>ipcRenderer.invoke('sort:scan',secret),
  executeSort:args=>ipcRenderer.invoke('sort:execute',args),
  readSeries:(planId,rowId)=>ipcRenderer.invoke('sort:read',{planId,rowId}),
  aiConfigure:config=>ipcRenderer.invoke('ai:configure',config),
  aiStatus:()=>ipcRenderer.invoke('ai:status'),
  aiForget:()=>ipcRenderer.invoke('ai:forget'),
  aiAsk:payload=>ipcRenderer.invoke('ai:ask',payload),
  onProgress:callback=>{const handler=(_,value)=>callback(value);ipcRenderer.on('sort:progress',handler);return ()=>ipcRenderer.removeListener('sort:progress',handler)}
}));
