try{var _t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark");document.documentElement.dataset.theme=_t}catch(e){}
addEventListener("DOMContentLoaded",function(){
  var b=document.getElementById("themeBtn");
  if(b){b.hidden=false;b.addEventListener("click",function(){var r=document.documentElement,n=r.dataset.theme==="dark"?"light":"dark";r.dataset.theme=n;try{localStorage.setItem("theme",n)}catch(e){}})}
  var mn=document.querySelector("details.menu");
  if(mn){
    document.addEventListener("click",function(e){if(mn.open&&!mn.contains(e.target))mn.open=false});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&mn.open){mn.open=false;var s=mn.querySelector("summary");if(s)s.focus()}});
  }
});
