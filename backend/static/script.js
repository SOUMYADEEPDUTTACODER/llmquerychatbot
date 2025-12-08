<<<<<<< HEAD
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
=======
document.addEventListener('DOMContentLoaded', function() {
    // ========== STATE MANAGEMENT ==========
  let currentMode = 'database';
    let collections = [];

    // ========== DOM ELEMENTS ==========
    const modeDatabaseBtn = document.getElementById('mode-database');
    const modeSerpapiBtn = document.getElementById('mode-serpapi');
    const currentModeTitle = document.querySelector('.current-mode-title');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const processingIndicator = document.getElementById('processing-indicator');
    const newChatBtn = document.getElementById('new-chat-btn');
    const csvFileInput = document.getElementById('csv-file');
    const collectionsList = document.getElementById('collections-list');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const toast = document.getElementById('toast');

    // ========== MODE SWITCHING ==========
  function switchMode(mode) {
    currentMode = mode;
    
    // Update button states
        modeDatabaseBtn.classList.toggle('active', mode === 'database');
        modeSerpapiBtn.classList.toggle('active', mode === 'serpapi');
        
        // Update title
        currentModeTitle.textContent = mode === 'database' ? 'Database Mode' : 'Web Search Mode';
        
        // Clear input
        userInput.value = '';
        updateSendButton();
    }

    modeDatabaseBtn.addEventListener('click', () => switchMode('database'));
    modeSerpapiBtn.addEventListener('click', () => switchMode('serpapi'));

    // ========== SEND BUTTON STATE ==========
    function updateSendButton() {
        const hasText = userInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d
    }

<<<<<<< HEAD
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
=======
    userInput.addEventListener('input', updateSendButton);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    });
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    // Store download data for messages
    const messageDownloadData = new Map();

    // ========== MESSAGE HANDLING ==========
    function addMessage(text, type = 'assistant', downloadData = null) {
        // Hide welcome screen
        if (welcomeScreen) {
            welcomeScreen.classList.add('hidden');
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        messageDiv.id = messageId;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? 'U' : 'A';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // Handle HTML content (from formatResults)
        if (typeof text === 'string' && (text.includes('<table') || text.includes('<div class="result-summary">'))) {
            textDiv.innerHTML = text;
        } else {
            // Escape and format plain text
            textDiv.textContent = text;
        }
        
        content.appendChild(avatar);
        content.appendChild(textDiv);
        messageDiv.appendChild(content);
        messagesWrapper.appendChild(messageDiv);
        
        // Store download data if provided
        if (downloadData && Array.isArray(downloadData)) {
            messageDownloadData.set(messageId, downloadData);
        }
        
        // Scroll to bottom
        messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
        
        // Attach download button listeners if present
        setTimeout(() => {
            const downloadBtn = messageDiv.querySelector('.download-csv');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    const data = messageDownloadData.get(messageId);
                    if (data) {
                        downloadCSV(data);
                    } else {
                        showToast('No data available for download', 'error');
                    }
                });
            }
        }, 100);
        
        return messageDiv;
    }

    function showProcessing() {
        if (processingIndicator) {
            processingIndicator.classList.remove('hidden');
        }
    }

    function hideProcessing() {
        if (processingIndicator) {
            processingIndicator.classList.add('hidden');
        }
    }

    // ========== SEND MESSAGE ==========
    async function sendMessage() {
        const question = userInput.value.trim();
    if (!question) return;

<<<<<<< HEAD
    addMessage(question, 'user');
    userInput.value = '';

    // Create loading message
    const loadingId = addMessage('Thinking...', 'system', true);
=======
        // Add user message
        addMessage(question, 'user');
        userInput.value = '';
        updateSendButton();
        userInput.style.height = 'auto';
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d

        // Show processing indicator
        showProcessing();

        try {
            let response;
            let data;

            if (currentMode === 'database') {
      console.log('Sending database query:', question);
                response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode: 'database' })
      });
            } else {
                console.log('Sending SerpAPI query:', question);
                response = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: question, limit: 10 })
                });
            }

<<<<<<< HEAD
      const data = await response.json();
      removeMessage(loadingId);
=======
            hideProcessing();
            
            console.log('Response status:', response.status, response.ok);
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('API error:', errorData);
                addMessage(`Error: ${errorData.error || 'Request failed'}`, 'error');
        return;
      }

<<<<<<< HEAD
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
=======
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
                addMessage(`Error: Failed to parse server response. ${jsonError.message}`, 'error');
        return;
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d
      }

            // Debug logging
            console.log('Response data:', data);
            console.log('Results array length:', Array.isArray(data.result) ? data.result.length : 'Not an array');
            console.log('Results:', data.result || data.patents || data.sample_result);
            console.log('Collections searched:', data.collections_searched);
            console.log('Result summary:', data.result_summary);

            // Handle response
            if (data.error) {
                addMessage(`Error: ${data.error}`, 'error');
        return;
      }

            // Format and display results
      const results = data.result || data.patents || data.sample_result || [];
            const summary = data.result_summary || data.summary || '';
            const collectionsSearched = data.collections_searched || [];

            // Enhanced summary with collection information
            let enhancedSummary = summary;
            if (collectionsSearched.length > 0 && currentMode === 'database') {
                if (!summary.includes('collection')) {
                    enhancedSummary = `${summary}\n\nSearched ${collectionsSearched.length} collection(s): ${collectionsSearched.join(', ')}`;
                }
            }

            if (Array.isArray(results) && results.length > 0) {
                const formattedMessage = formatResults(results, enhancedSummary, data);
                addMessage(formattedMessage, 'assistant', results);
            } else if (enhancedSummary) {
                // Show summary even if no results, to indicate which collections were searched
                addMessage(enhancedSummary, 'assistant');
            } else {
                const noResultsMsg = collectionsSearched.length > 0 
                    ? `No results found in ${collectionsSearched.length} collection(s): ${collectionsSearched.join(', ')}. Try rephrasing your query.`
                    : 'No results found. Try rephrasing your query.';
                addMessage(noResultsMsg, 'assistant');
            }

        } catch (error) {
            hideProcessing();
            addMessage(`Error: ${error.message}`, 'error');
            console.error('Error sending message:', error);
        }
    }

<<<<<<< HEAD
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
=======
    sendBtn.addEventListener('click', sendMessage);

    // ========== FORMAT RESULTS ==========
    function formatResults(results, summary, data) {
        if (!Array.isArray(results) || results.length === 0) {
            return summary || 'No results found.';
        }

        // Get all unique keys, excluding MongoDB internal fields
        const excludeKeys = ['_id', '_source'];
        const keys = [...new Set(results.flatMap(r => Object.keys(r).filter(k => !excludeKeys.includes(k))))];
        
        // Order keys: _collection first, then others, ai_summary and Link last
        let orderedKeys = keys.filter(k => k !== '_source' && k !== 'ai_summary' && k !== 'Link' && k !== '_id');
    if (keys.includes('_collection')) {
      orderedKeys = ['_collection', ...orderedKeys.filter(k => k !== '_collection')];
    }
    if (keys.includes('ai_summary')) orderedKeys.push('ai_summary');
    if (keys.includes('Link')) orderedKeys.push('Link');
    
        // Build HTML
        let html = '';
        
        // Summary with collection information
        if (summary) {
            // Format summary with line breaks for better readability
            const escapedSummary = escapeHtml(summary);
            const formattedSummary = escapedSummary.replace(/\n/g, '<br>');
            html += `<div class="result-summary" style="margin-bottom: 1rem; padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 0.5rem; border-left: 3px solid var(--accent-color); line-height: 1.6;">${formattedSummary}</div>`;
        }
        
        // Show collections searched info if available and not already in summary
        if (data && data.collections_searched && data.collections_searched.length > 0) {
            const collectionsInfo = data.collections_searched.join(', ');
            // Only show if summary doesn't already mention collections
            if (!summary || !summary.toLowerCase().includes('collection')) {
                html += `<div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(52, 211, 153, 0.1); border-radius: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                    <strong>Collections searched:</strong> ${escapeHtml(collectionsInfo)}
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d
      </div>`;
            }
        }

        // Table wrapper with horizontal scroll
        html += '<div style="overflow-x: auto; margin: 1rem 0; border-radius: 0.5rem;">';
        html += '<table style="width: 100%; border-collapse: collapse; min-width: 800px; font-size: 0.9rem;">';
        
        // Define column widths for better layout
        const getColumnWidth = (key) => {
            if (key === '_collection') return '120px';
            if (key === 'Link') return '150px';
            if (key === 'Year' || key === 'Date') return '100px';
            if (key === 'Title' || key === 'Name') return '200px';
            if (key === 'Abstract' || key === 'Description' || key === 'ai_summary') return '300px';
            if (key === 'Inventor' || key === 'Assignee' || key === 'Organization') return '180px';
            return '150px'; // Default width
        };
        
        // Header row
        html += '<tr>';
        orderedKeys.forEach(k => {
            const headerStyle = k === '_collection' || k === 'ai_summary' || k === 'Link' 
                ? 'background: var(--gradient-accent); color: white;'
                : 'background: var(--input-bg);';
            const width = getColumnWidth(k);
            html += `<th style="${headerStyle} padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); text-align: left; font-weight: 600; font-size: 0.85rem; white-space: nowrap; width: ${width}; min-width: ${width}; max-width: ${width};">${escapeHtml(k)}</th>`;
        });
        html += '</tr>';

        // Helper function to truncate text
        const truncateText = (text, maxLength = 150) => {
            if (!text) return '';
            const str = String(text);
            if (str.length <= maxLength) return str;
            return str.substring(0, maxLength) + '...';
        };

        // Data rows
        results.forEach((r, idx) => {
            html += '<tr>';
            orderedKeys.forEach(k => {
                let cellContent = r[k];
                let cellStyle = '';
                let titleAttr = ''; // For tooltip on truncated text
                
                // Handle null/undefined
                if (cellContent == null || cellContent === '') {
                    cellContent = '<span style="color: var(--text-secondary); font-style: italic;">N/A</span>';
                } else if (k === 'Link' && cellContent) {
                    // Handle Link column
                    const linkText = String(cellContent);
                    cellContent = `<a href="${escapeHtml(linkText)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-light); text-decoration: underline; white-space: nowrap;">View</a>`;
                } else if (k === '_collection') {
                    // Highlight collection column - compact
                    cellStyle = 'background: rgba(99, 102, 241, 0.1); font-weight: 600; color: var(--accent-light); white-space: nowrap;';
                    cellContent = escapeHtml(String(cellContent));
                } else if (k === 'ai_summary' && cellContent) {
                    // Format AI summary - allow wrapping
                    const summaryText = String(cellContent);
                    const truncated = truncateText(summaryText, 250);
                    cellContent = escapeHtml(truncated);
                    if (summaryText.length > 250) {
                        titleAttr = `title="${escapeHtml(summaryText)}"`;
                    }
                    cellStyle = 'font-style: italic; color: var(--text-secondary); line-height: 1.4; white-space: normal; word-wrap: break-word;';
                } else if (k === 'Abstract' || k === 'Description') {
                    // Truncate long abstracts/descriptions - allow wrapping
                    const text = String(cellContent);
                    const truncated = truncateText(text, 250);
                    cellContent = escapeHtml(truncated);
                    if (text.length > 250) {
                        titleAttr = `title="${escapeHtml(text)}"`;
                    }
                    cellStyle = 'line-height: 1.4; white-space: normal; word-wrap: break-word;';
                } else if (typeof cellContent === 'object') {
                    // Handle objects/arrays - convert to JSON string and truncate
                    try {
                        const jsonStr = JSON.stringify(cellContent, null, 2);
                        const truncated = truncateText(jsonStr, 150);
                        cellContent = escapeHtml(truncated);
                        if (jsonStr.length > 150) {
                            titleAttr = `title="${escapeHtml(jsonStr)}"`;
                        }
                        cellStyle = 'font-family: var(--font-mono); font-size: 0.8rem; white-space: normal; word-wrap: break-word;';
                    } catch (e) {
                        cellContent = escapeHtml(String(cellContent));
                    }
                } else {
                    // Regular text content - truncate if too long, allow wrapping for longer fields
                    const text = String(cellContent);
                    const isLongField = ['Title', 'Name', 'Inventor', 'Assignee', 'Organization'].includes(k);
                    const maxLen = isLongField ? 80 : 50;
                    const truncated = truncateText(text, maxLen);
                    cellContent = escapeHtml(truncated);
                    if (text.length > maxLen) {
                        titleAttr = `title="${escapeHtml(text)}"`;
                    }
                    // Allow wrapping for longer fields
                    if (isLongField) {
                        cellStyle = 'white-space: normal; word-wrap: break-word;';
                    }
                }
                
                const width = getColumnWidth(k);
                const wrapStyle = (k === 'Abstract' || k === 'Description' || k === 'ai_summary' || ['Title', 'Name', 'Inventor', 'Assignee', 'Organization'].includes(k))
                    ? 'white-space: normal; word-wrap: break-word;'
                    : 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                
                html += `<td ${titleAttr} style="${cellStyle} ${wrapStyle} padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); width: ${width}; min-width: ${width}; max-width: ${width}; vertical-align: top;">${cellContent}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        html += '</div>';

        // Download button
        html += `
            <div style="margin-top: 1rem; text-align: right;">
                <button class="download-csv" style="
                    background: var(--gradient-accent);
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                ">⬇️ Download as CSV</button>
            </div>`;

        return html;
    }

    // ========== CSV DOWNLOAD ==========
  function downloadCSV(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            showToast('No data to export.', 'error');
      return;
    }

        // Get all headers
        const headers = [...new Set(data.flatMap(r => Object.keys(r)))];
        
        // Create CSV rows
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(h => {
          let val = row[h] ?? '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
            });
      csvRows.push(values.join(','));
        });

        // Download
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
        
        showToast('CSV downloaded successfully!', 'success');
    }

    // ========== CSV UPLOAD ==========
    csvFileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        showToast('Uploading CSV...', 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/import-csv', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            showToast(`✅ CSV imported: ${data.collection}`, 'success');
            csvFileInput.value = '';
            // Reload collections after import
            setTimeout(loadCollections, 500);
        } catch (error) {
            showToast(`❌ Upload failed: ${error.message}`, 'error');
            console.error('CSV upload error:', error);
        }
    });

    // ========== COLLECTIONS LOADING ==========
    async function loadCollections() {
        try {
            const response = await fetch('/api/collections');
            if (!response.ok) throw new Error('Failed to fetch collections');
            
            const data = await response.json();
            collections = data.collections || [];
            
            if (collections.length === 0) {
                collectionsList.innerHTML = '<div class="collection-item empty">No data loaded</div>';
            } else {
                collectionsList.innerHTML = collections.map(c => 
                    `<div class="collection-item">
                        <span>${escapeHtml(c.name)}</span>
                        <span class="count">${c.count}</span>
                    </div>`
                ).join('');
            }
        } catch (error) {
            console.error('Error loading collections:', error);
            collectionsList.innerHTML = '<div class="collection-item empty">Error loading collections</div>';
        }
    }

    // ========== NEW CHAT ==========
    newChatBtn.addEventListener('click', function() {
        messagesWrapper.innerHTML = '';
        if (welcomeScreen) {
            welcomeScreen.classList.remove('hidden');
        }
        userInput.value = '';
        updateSendButton();
    });

    // ========== MOBILE MENU ==========
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside (mobile)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ========== TOAST NOTIFICATIONS ==========
    function showToast(message, type = 'info') {
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // ========== UTILITY FUNCTIONS ==========
    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // ========== INITIALIZATION ==========
    loadCollections();
    updateSendButton();
});
