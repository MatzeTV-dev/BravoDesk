function showSection(sectionId, navItem) {
  // Sicherstellen, dass sectionId gültig ist, bevor sie verwendet wird.
  const sectionElement = document.getElementById(sectionId);
  if (!sectionElement) {
    console.error("Ungültige sectionId:", sectionId);
    return;
  }
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  sectionElement.classList.add('active');
  document.querySelectorAll('.nav li').forEach(li => {
    li.classList.remove('active');
  });
  navItem.classList.add('active');
}

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
  // Sicherer Umgang mit dynamischen Inhalten: Verwendung von textContent.
  document.getElementById("selectedServer").textContent = serverName;
  toggleMenu("serverDropdown");
}

document.addEventListener("click", function(event) {
  if (!event.target.closest("#serverButton") && !event.target.closest("#serverDropdown")) {
    var serverDropdown = document.getElementById("serverDropdown");
    if (serverDropdown && serverDropdown.style.display === "block") {
      toggleMenu("serverDropdown");
    }
  }
  if (!event.target.closest(".user-info") && !event.target.closest("#userMenu")) {
    var userMenu = document.getElementById("userMenu");
    if (userMenu && userMenu.style.display === "block") {
      toggleMenu("userMenu", "userArrow");
    }
  }
});

function notify(message, duration = 3000, type = "info") {
    const container = document.getElementById("notifyContainer");
    if (container.children.length >= 5) {
      container.removeChild(container.firstChild);
    }
    const notifyDiv = document.createElement("div");
    notifyDiv.className = `notify ${type}`;
    // Nachricht als Textinhalt einfügen, um XSS zu verhindern
    notifyDiv.textContent = message;
    container.appendChild(notifyDiv);
    setTimeout(() => { notifyDiv.classList.add("show"); }, 10);
    setTimeout(() => {
      notifyDiv.classList.remove("show");
      setTimeout(() => { if (container.contains(notifyDiv)) { container.removeChild(notifyDiv); } }, 500);
    }, duration);
}

var emojiFields = document.querySelectorAll('.emoji-field');
var triggers = [];
emojiFields.forEach(function(el) {
  triggers.push({
    selector: '#' + el.id,
    insertInto: '#' + el.id
  });
});
new EmojiPicker({
  trigger: triggers,
  closeButton: true,
  closeOnSelect: true,
  specialButtons: 'green'
});
