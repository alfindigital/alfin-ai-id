try{var _t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark");document.documentElement.dataset.theme=_t}catch(e){}
addEventListener("DOMContentLoaded",function(){
  var b=document.getElementById("themeBtn");
  if(b){b.hidden=false;b.addEventListener("click",function(){var r=document.documentElement,n=r.dataset.theme==="dark"?"light":"dark";r.dataset.theme=n;try{localStorage.setItem("theme",n)}catch(e){}})}
  var rvs=document.querySelectorAll(".reel video");
  rvs.forEach(function(v){
    var f=v.closest(".reel"),b=f.querySelector(".reel-btn"),t=f.dataset.title||"video";
    var sync=function(){var p=v.paused;f.toggleAttribute("data-paused",p);b.setAttribute("aria-label",(p?"Play ":"Pause ")+t)};
    var tog=function(){if(v.paused){var r=v.play();if(r&&r.catch)r.catch(function(){})}else v.pause()};
    v.addEventListener("play",function(){rvs.forEach(function(o){if(o!==v&&!o.paused)o.pause()});sync()});
    v.addEventListener("pause",sync);v.addEventListener("ended",sync);
    b.addEventListener("click",tog);v.addEventListener("click",tog);
    v.controls=false;b.hidden=false;sync();
  });
  var mn=document.querySelector("details.menu");
  if(mn){
    document.addEventListener("click",function(e){if(mn.open&&!mn.contains(e.target))mn.open=false});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&mn.open){mn.open=false;var s=mn.querySelector("summary");if(s)s.focus()}});
  }
});
