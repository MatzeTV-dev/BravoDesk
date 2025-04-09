function loadUserInfo() {
  fetch('/api/user')
    .then(response => response.json())
    .then(user => {
      console.log("User-Daten:", user);

      const userNameSpan = document.querySelector('.user-name');
      if (userNameSpan && user.global_name) {
        // Nutzung von textContent statt innerText, um sicherzustellen, dass keine HTML-Injektionen möglich sind
        if (user.discriminator && user.discriminator !== "0") {
          userNameSpan.textContent = `${user.global_name}#${user.discriminator}`;
        } else {
          userNameSpan.textContent = user.global_name;
        }
      }

      const userAvatar = document.querySelector('.user-avatar');
      if (userAvatar) {
        // URL-Komponenten werden mittels encodeURIComponent sicher eingebettet
        const avatarUrl = user.avatar 
          ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
        userAvatar.style.backgroundImage = `url(${avatarUrl})`;
      }

      // Status setzen (statisch, da /users/@me keine Presence liefert)
      /*const statusSpan = document.querySelector('.user-status');
      if (statusSpan) {
        statusSpan.textContent = "Online";
        statusSpan.style.color = "limegreen";
      }*/
    })
    .catch(err => console.error("Fehler beim Laden der User-Daten:", err));
}

function logout() {
  toggleMenu("userMenu", "userArrow");
  fetch('/auth/logout')
    .then(() => {
      window.location.href = '/';
    })
    .catch(err => console.error("Fehler beim Abmelden:", err));
}

window.addEventListener('load', loadUserInfo);
