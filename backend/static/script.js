document.addEventListener('DOMContentLoaded', function() {
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
  setupDbButton.addEventListener('click', async function() {
    setupMessage.textContent = 'Setting up sample database...';
    setupMessage.style.backgroundColor = '#e0f7fa';

    try {
      const response = await fetch('/api/setup', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Setup failed');

      setupMessage.textContent = data.message;
      setupMessage.style.backgroundColor = '#e8f5e9';
    } catch (error) {
      setupMessage.textContent = 'Failed to setup database: ' + error.message;
      setupMessage.style.backgroundColor = '#ffebee';
    }
  });

  // === Handle CSV upload and import ===
  importCsvButton.addEventListener('click', async function() {
    const file = csvFileInput.files[0];
    if (!file) {
      importMessage.textContent = 'Please select a CSV file first.';
      importMessage.style.backgroundColor = '#fff3e0';
      return;
    }

    importMessage.textContent = 'Uploading and importing CSV...';
    importMessage.style.backgroundColor = '#e0f7fa';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'CSV import failed');

      importMessage.textContent = `✅ CSV imported successfully into collection: ${data.collection}`;
      importMessage.style.backgroundColor = '#e8f5e9';
    } catch (error) {
      importMessage.textContent = '❌ Failed to import CSV: ' + error.message;
      importMessage.style.backgroundColor = '#ffebee';
    }
  });

  // === Allow clicking the label to open file picker ===
  document.querySelector('.upload-label').addEventListener('click', () => csvFileInput.click());

  // === Send user query ===
  async function sendQuery() {
    const question = userInput.value.trim();
    if (!question) return;

    addMessage(question, 'user');
    userInput.value = '';
    const loadingMsgId = addMessage('Processing your question...', 'system');

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();
      removeMessage(loadingMsgId);

      if (!response.ok || data.error) {
        addMessage(`Error: ${data.error}`, 'error');
        return;
      }

      // === Show parsed query (Mongo/SQL-like) ===
      if (data.query)
        queryDisplay.textContent = JSON.stringify(data.query, null, 2);

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
      removeMessage(loadingMsgId);
      addMessage(`Error processing your query: ${error.message}`, 'error');
    }
  }

  sendButton.addEventListener('click', sendQuery);
  userInput.addEventListener('keypress', e => e.key === 'Enter' && sendQuery());

  // === Safe message rendering ===
  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    const id = Date.now().toString();
    msg.id = id;

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
      msg.innerHTML = text;
    } else {
      msg.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
    }

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
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
          background:#5e81f4;
          color:#fff;
          border:none;
          border-radius:8px;
          padding:6px 12px;
          font-size:0.85rem;
          cursor:pointer;
          transition:all 0.2s ease;
        ">⬇️ Download as CSV</button>
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
