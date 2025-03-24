  /* Tabs umschalten */
  function showSection(sectionId, navItem) {
    // Alle Tabs ausblenden
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    // Gewünschten Tab anzeigen
    document.getElementById(sectionId).classList.add('active');
    // Navigation reset
    document.querySelectorAll('.nav li').forEach(li => {
      li.classList.remove('active');
    });
    // Geklicktes Nav-Item hervorheben
    navItem.classList.add('active');
  }

  /* Server-Dropdown */
  function toggleMenu(menuId, arrowId) {
    var menu = document.getElementById(menuId);
    var arrow = arrowId ? document.getElementById(arrowId) : null;
    if (menu.style.display === "block") {
      menu.style.opacity = "0";
      menu.style.transform = "translateY(" + (menuId === 'userMenu' ? '10px' : '-10px') + ")";
      setTimeout(function() { menu.style.display = "none"; }, 300);
      if (arrow) arrow.style.transform = "rotate(0deg)";
    } else {
      menu.style.display = "block";
      setTimeout(function() {
        menu.style.opacity = "1";
        menu.style.transform = "translateY(0)";
      }, 10);
      if (arrow) arrow.style.transform = "rotate(180deg)";
    }
    
  }
  function selectServer(serverName) {
    document.getElementById("selectedServer").innerText = serverName;
    toggleMenu("serverDropdown");
  }

  /* Klick außerhalb schließt Menüs */
  document.addEventListener("click", function(event) {
    // Server-Dropdown
    if (!event.target.closest("#serverButton") && !event.target.closest("#serverDropdown")) {
      var serverDropdown = document.getElementById("serverDropdown");
      if (serverDropdown && serverDropdown.style.display === "block") {
        toggleMenu("serverDropdown");
      }
    }
    // User-Menü
    if (!event.target.closest(".user-info") && !event.target.closest("#userMenu")) {
      var userMenu = document.getElementById("userMenu");
      if (userMenu && userMenu.style.display === "block") {
        toggleMenu("userMenu", "userArrow");
      }
    }
});

// Beispiel: Notify-Funktion, zeigt maximal 5 Benachrichtigungen an (ältere werden entfernt)
function notify(message, duration = 3000, type = "info") {
    const container = document.getElementById("notifyContainer");
    if (container.children.length >= 5) {
      container.removeChild(container.firstChild);
    }
    const notifyDiv = document.createElement("div");
    notifyDiv.className = `notify ${type}`;
    notifyDiv.textContent = message;
    container.appendChild(notifyDiv);
    setTimeout(() => { notifyDiv.classList.add("show"); }, 10);
    setTimeout(() => {
      notifyDiv.classList.remove("show");
      setTimeout(() => { if (container.contains(notifyDiv)) { container.removeChild(notifyDiv); } }, 500);
    }, duration);
  }

  // Initialisierung des vanillaEmojiPicker für alle Felder mit der Klasse "emoji-field".
  // Hier bauen wir ein Trigger-Array, das jedem Feld als eindeutigen Trigger zugeordnet wird.
  var emojiFields = document.querySelectorAll('.emoji-field');
  var triggers = [];
  emojiFields.forEach(function(el) {
    // Nutze die ID des Elements für den eindeutigen Selector.
    triggers.push({
      selector: '#' + el.id,
      insertInto: '#' + el.id
    });
  });
  new EmojiPicker({
    trigger: triggers,
    closeButton: true,      // Schließt den Picker über einen Button
    closeOnSelect: true,    // Schließt den Picker nach Auswahl eines Emojis
    specialButtons: 'green' // Setzt den Hintergrund der Sonderbuttons auf grün
  });