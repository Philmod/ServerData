var dateLang = new Array();
var nbLang = 139;
for (var i=0; i<nbLang; i++) { dateLang[i] = {}; }

///// ANGLAIS /////
en = {
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
}

dateLang[1] = en;
////////////////////

///// FRANCAIS /////
fr = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  daysShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  months: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthsShort: ['Jan','Fév','Mar','Avr','Mai','Jui','Jui','Aoû','Sep','Oct','Nov','Déc']
}
dateLang[2] = fr;
////////////////////

for (var p in en) {
  for (var i=2; i<nbLang; i++) { 
    if (!dateLang[i][p]) { dateLang[i][p] = dateLang[1][p] }
  }
}

(function(exports){
  exports.dateLang = dateLang;
})(typeof exports === 'undefined'? this['dateLang']: exports);
