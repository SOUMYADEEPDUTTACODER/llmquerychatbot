document.addEventListener('DOMContentLoaded', function () {
  const setupDbButton = document.getElementById('setup-db');
  const importCsvButton = document.getElementById('import-csv');
  const csvFileInput = document.getElementById('csv-file');
  const setupMessage = document.getElementById('setup-message');
  const importMessage = document.getElementById('import-message');
  const chatMessages = document.getElementById('chat-messages');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const queryDisplay = document.getElementById('query-display');

  // === Setup sample database ===
  setupDbButton.addEventListener('click', async function () {
    setupMessage.innerHTML = '<span style="color: #94a3b8;">Setting up...</span>';

    try {
      const response = await fetch('/api/setup', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Setup failed');

      setupMessage.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-check"></i> ${data.message}</span>`;
    } catch (error) {
      setupMessage.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> ${error.message}</span>`;
    }
  });

  // === Handle CSV upload and import ===
  importCsvButton.addEventListener('click', async function () {
    const file = csvFileInput.files[0];
    if (!file) {
      importMessage.innerHTML = '<span style="color: #fbbf24;">Please select a CSV file first.</span>';
      return;
    }

    importMessage.innerHTML = '<span style="color: #94a3b8;">Importing...</span>';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'CSV import failed');

      importMessage.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-check"></i> Imported to: ${data.collection}</span>`;
    } catch (error) {
      importMessage.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> ${error.message}</span>`;
    }
  });

  // === Allow clicking the label to open file picker ===
  // Note: The label 'for' attribute handles this natively, but we keep the listener if needed for custom behavior.
  // document.querySelector('.upload-label').addEventListener('click', () => csvFileInput.click());

  // === Suggestion Chips ===
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInput.value = chip.textContent;
      userInput.focus();
    });
  });

  // === Send user query ===
  async function sendQuery() {
    const question = userInput.value.trim();
    if (!question) return;

    addMessage(question, 'user');
    userInput.value = '';

    // Create loading message
    const loadingId = addMessage('Thinking...', 'system', true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();
      removeMessage(loadingId);

      if (!response.ok || data.error) {
        addMessage(`Error: ${data.error}`, 'error');
        return;
      }

      // === Show parsed query (Mongo/SQL-like) ===
      if (data.query) {
        // Animate the query display
        const queryText = JSON.stringify(data.query, null, 2);
        typeWriter(queryDisplay, queryText);
      }

      // === Show result or summary ===
      const results = data.result || data.sample_result || [];
      const summary = data.result_summary || '';

      let resultMessage = '';
      if (Array.isArray(results)) {
        resultMessage = results.length
          ? formatResults(results, summary, results)
          : 'No results found for your query.';
      } else if (typeof results === 'number') {
        resultMessage = `Result: ${results}`;
      } else {
        resultMessage = JSON.stringify(results, null, 2);
      }

      addMessage(resultMessage, 'system');
    } catch (error) {
      removeMessage(loadingId);
      addMessage(`Error processing your query: ${error.message}`, 'error');
    }
  }

  sendButton.addEventListener('click', sendQuery);
  userInput.addEventListener('keypress', e => e.key === 'Enter' && sendQuery());

  // === Safe message rendering ===
  function addMessage(text, type, isLoading = false) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    const id = Date.now().toString();
    msg.id = id;

    // Avatar Icon
    let avatarIcon = type === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    if (type === 'error') avatarIcon = '<i class="fa-solid fa-triangle-exclamation"></i>';

    // Content processing
    let contentHtml = '';

    if (isLoading) {
      contentHtml = '<div class="pulse" style="margin: 5px 0;"></div> Processing...';
    } else {
      // ✅ Safe stringify for non-string inputs
      if (typeof text !== 'string') {
        try {
          text = JSON.stringify(text, null, 2);
        } catch {
          text = String(text);
        }
      }

      // ✅ Render HTML tables & result summaries properly
      if (text.startsWith('<div class="result-summary">') || text.startsWith('<table')) {
        contentHtml = text;
      } else {
        contentHtml = `<p>${escapeHtml(text)}</p>`;
      }
    }

    msg.innerHTML = `
        <div class="avatar">${avatarIcon}</div>
        <div class="content">${contentHtml}</div>
    `;

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // === Typewriter Effect for Code ===
  function typeWriter(element, text, i = 0) {
    if (i === 0) element.textContent = '';
    if (i < text.length) {
      element.textContent += text.charAt(i);
      setTimeout(() => typeWriter(element, text, i + 1), 5); // Fast typing
    }
  }

  // === Format tabular results + summary + Download button ===
  function formatResults(results, summary = '', rawData = []) {
    if (!results.length) return 'No results found.';
    const keys = [...new Set(results.flatMap(r => Object.keys(r)))];

    let table = `<div class="result-summary">${escapeHtml(summary)}</div>`;
    table += '<table><tr>' + keys.map(k => `<th>${escapeHtml(k)}</th>`).join('') + '</tr>';
    results.forEach(r => {
      table += '<tr>' + keys.map(k => `<td>${escapeHtml(r[k]) ?? ''}</td>`).join('') + '</tr>';
    });
    table += '</table>';

    // ✅ Add Download button
    table += `
      <div style="margin-top:10px; text-align:right;">
        <button class="download-csv" style="
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        ">⬇️ Download CSV</button>
      </div>`;

    // Defer attaching event listener after rendering
    setTimeout(() => {
      const lastMsg = chatMessages.lastElementChild;
      if (!lastMsg) return;
      const btn = lastMsg.querySelector('.download-csv');
      if (btn) {
        btn.addEventListener('click', () => downloadCSV(rawData));
      }
    }, 50);

    return table;
  }

  // === Convert JSON to CSV and trigger download ===
  function downloadCSV(data) {
    if (!data || !data.length) {
      alert('No data to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        let val = row[h] ?? '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // === Prevent HTML injection ===
  function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
