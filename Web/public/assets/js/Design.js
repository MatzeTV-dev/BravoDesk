function uploadImage() {
  alert("Hier könntest du einen Dateiauswahldialog öffnen und das Bild hochladen.");
}

function saveDesign() {
  // Lese und trimme die Eingaben, um überflüssige Leerzeichen zu entfernen.
  var botName = document.getElementById("botName").value.trim();
  var botStatus = document.getElementById("botStatus").value.trim();

  // Optionale Validierung: Maximale Längen prüfen, um überlange Eingaben zu verhindern
  if(botName.length > 100) {
      alert("Bot Name darf maximal 100 Zeichen enthalten.");
      return;
  }
  if(botStatus.length > 200) {
      alert("Bot Status darf maximal 200 Zeichen enthalten.");
      return;
  }

  // Optionale Sanitization: Falls die Werte später weiterverarbeitet oder in das DOM eingefügt werden,
  // können weitere Maßnahmen (z.B. Escaping) sinnvoll sein. Da hier nur ein Alert genutzt wird,
  // besteht aktuell kein direktes Injektionsrisiko.
  alert("Design gespeichert!\nBot Name: " + botName + "\nBot Status: " + botStatus);
}
