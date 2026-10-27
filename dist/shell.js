// Keep the compact project menu keyboard accessible and dismiss it after actions.
'use strict';
const projectMenu=document.querySelector('.header-more');
projectMenu.addEventListener('click',event=>{if(event.target.closest('button'))projectMenu.open=false});
document.addEventListener('pointerdown',event=>{if(projectMenu.open&&!projectMenu.contains(event.target))projectMenu.open=false});
projectMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();projectMenu.open=false;projectMenu.querySelector('summary').focus()}});
