try{var _t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark");document.documentElement.dataset.theme=_t}catch(e){}
addEventListener("DOMContentLoaded",function(){
  var b=document.getElementById("themeBtn");
  if(b){b.hidden=false;b.addEventListener("click",function(){var r=document.documentElement,n=r.dataset.theme==="dark"?"light":"dark";r.dataset.theme=n;try{localStorage.setItem("theme",n)}catch(e){}})}
  var rv=document.querySelector("video[data-showcase]"),rb=document.querySelector(".reel-btn");
  if(rv&&rb){
    var fg=rv.closest(".reel");
    var sync=function(){var p=rv.paused;fg.toggleAttribute("data-paused",p);rb.setAttribute("aria-label",p?"Play video":"Pause video")};
    var tog=function(){if(rv.paused){var r=rv.play();if(r&&r.catch)r.catch(function(){})}else rv.pause()};
    if(matchMedia("(prefers-reduced-motion:reduce)").matches){rv.removeAttribute("autoplay");rv.pause()}
    rv.addEventListener("play",sync);rv.addEventListener("pause",sync);
    rb.addEventListener("click",tog);rv.addEventListener("click",tog);
    rb.hidden=false;sync();
  }
  var mn=document.querySelector("details.menu");
  if(mn){
    document.addEventListener("click",function(e){if(mn.open&&!mn.contains(e.target))mn.open=false});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&mn.open){mn.open=false;var s=mn.querySelector("summary");if(s)s.focus()}});
  }
});
