(function () {
  window.addEventListener('error', function (event) {
    var status = document.getElementById('chat-status');
    if (!status) return;
    var failedScript = event.target && event.target.tagName === 'SCRIPT';
    if (failedScript || event.filename) {
      status.textContent = '页面没有完整启动，请刷新后再试。如果仍无响应，请告诉我这条提示。';
      status.classList.add('is-error');
    }
  }, true);
})();
