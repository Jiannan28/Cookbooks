


vizuly.showreel = function (theme, skins, delay) {

 if (!delay) delay = 500;

 var timer;
 var stop=false;
 var tween;

 var reel = function () {
   return reel;
 }

 reel.start = function () {

  var i=0;

  timer = d3.timer(function(elapsed) {

   if (elapsed > (i + 1) * delay ) {
    theme.skin(skins[i]).viz().update();
    if (tween) tween.apply(this,[theme]);
    i++;
   }
   if (elapsed > skins.length * delay || stop == true) {
     return true;
   }
  }, 50);

  return reel;
 }


 reel.tween = function (_) {
   if(!arguments.length) {
    return tween;
   }
   tween = _;
   return reel;
 }

 reel.stop = function () {
   stop=true;
  return reel;
 }

 return reel();

}