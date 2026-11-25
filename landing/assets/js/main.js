const dialog = document.querySelector('#art-view');

if (dialog && typeof dialog.showModal === 'function') {
  const artwork = dialog.querySelector('img');
  document.querySelectorAll('[data-art]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      artwork.src = link.href;
      artwork.alt = link.querySelector('img').alt;
      dialog.showModal();
    });
  });
}
