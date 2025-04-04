function loadUserInfo() {
  fetch('/api/user')
    .then(response => response.json())
    .then(user => {
      console.log("User-Daten:", user);

      const userNameSpan = document.querySelector('.user-name');
      if (userNameSpan && user.global_name) {
        if (user.discriminator && user.discriminator !== "0") {
          userNameSpan.innerText = `${user.global_name}#${user.discriminator}`;
        } else {
          userNameSpan.innerText = user.global_name;
        }
      }

      const userAvatar = document.querySelector('.user-avatar');
      if (userAvatar) {
        const avatarUrl = user.avatar 
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
        userAvatar.style.backgroundImage = `url(${avatarUrl})`;
      }

      // Status setzen (statisch, da /users/@me keine Presence liefert)
      /*const statusSpan = document.querySelector('.user-status');
      if (statusSpan) {
        statusSpan.innerText = "Online";
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
