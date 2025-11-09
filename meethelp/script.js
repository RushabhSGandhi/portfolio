// Check if browser supports Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
}

let recognition = null;
let isRecording = false;
let accumulatedText = ''; // All accumulated final transcription text
let lastProcessedIndex = -1; // Track the last result index we've processed
let lastInterimText = ''; // Track last interim text to avoid unnecessary updates
let currentTextEl = null; // Cache textarea element
let lastDisplayText = ''; // Cache last display text to avoid unnecessary DOM updates
let lastUpdateTime = 0; // Throttle interim updates
const INTERIM_UPDATE_THROTTLE = 50; // Update interim text at most every 50ms

// Initialize Speech Recognition
function initSpeechRecognition() {
    if (!SpeechRecognition) return;
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1; // Only get best result for speed
    
    recognition.onstart = () => {
        isRecording = true;
        updateUI(true);
        console.log('Speech recognition started');
    };
    
    recognition.onresult = (event) => {
        // Cache textarea element on first use
        if (!currentTextEl) {
            currentTextEl = document.getElementById('currentText');
        }
        
        let newFinalText = '';
        let interimTranscript = '';
        let hasNewFinal = false;
        
        // Only process NEW results (from resultIndex onwards that we haven't processed)
        const startIndex = Math.max(event.resultIndex, lastProcessedIndex + 1);
        
        // Process all results in one pass
        for (let i = startIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                // Final result - add to accumulated text
                newFinalText += transcript + ' ';
                lastProcessedIndex = i;
                hasNewFinal = true;
            } else {
                // Interim result - only keep the latest one
                interimTranscript = transcript;
            }
        }
        
        // Update accumulated text if we have new final results
        if (hasNewFinal) {
            accumulatedText += newFinalText;
            // Reset interim when we get final results
            lastInterimText = '';
        }
        
        // Check if we should update the display
        const isFocused = document.activeElement === currentTextEl;
        if (isFocused) {
            const cursorPos = currentTextEl.selectionStart;
            const textLength = currentTextEl.value.length;
            // Only update if cursor is at the end (user isn't editing in the middle)
            if (cursorPos !== textLength) {
                return; // User is editing, don't update
            }
        }
        
        // Build display text immediately
        const displayText = accumulatedText + (interimTranscript || '');
        
        // Throttle interim-only updates (final results always update immediately)
        const now = Date.now();
        if (!hasNewFinal && interimTranscript) {
            // For interim updates, throttle to reduce lag
            if ((now - lastUpdateTime) < INTERIM_UPDATE_THROTTLE) {
                // Skip this interim update if it's the same or too soon
                if (interimTranscript === lastInterimText) {
                    return;
                }
            }
        }
        
        // Skip update if display text hasn't changed
        if (displayText === lastDisplayText) {
            lastInterimText = interimTranscript || '';
            return;
        }
        
        // Update tracking variables
        lastInterimText = interimTranscript || '';
        lastUpdateTime = now;
        
        // Update DOM immediately (no batching for fastest response)
        currentTextEl.value = displayText;
        lastDisplayText = displayText;
        
        // Move cursor to end
        const len = displayText.length;
        currentTextEl.setSelectionRange(len, len);
        
        // Update send button state efficiently
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.disabled = len === 0;
        }
    };
    
    recognition.onerror = (event) => {
        // Don't log common non-critical errors
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
            updateStatus('Error: ' + event.error, false);
        }
        
        if (event.error === 'no-speech') {
            // Restart immediately for faster recovery (use setTimeout instead of RAF for reliability)
            if (isRecording) {
                setTimeout(() => {
                    if (isRecording) {
                        try {
                            recognition.start();
                        } catch (e) {
                            // Ignore restart errors
                        }
                    }
                }, 10);
            }
        }
    };
    
    recognition.onend = () => {
        if (isRecording) {
            // Restart immediately without delay for continuous recognition
            // Use setTimeout instead of RAF for more reliable restart
            setTimeout(() => {
                if (isRecording) {
                    try {
                        recognition.start();
                    } catch (e) {
                        // Ignore restart errors - recognition might already be starting
                    }
                }
            }, 10);
        } else {
            updateUI(false);
        }
    };
}

// Update UI based on recording state
function updateUI(recording) {
    const recordToggleBtn = document.getElementById('recordToggleBtn');
    const recordIcon = recordToggleBtn.querySelector('.record-icon');
    
    if (recording) {
        recordToggleBtn.classList.add('recording');
        recordIcon.textContent = '🟥';
    } else {
        recordToggleBtn.classList.remove('recording');
        recordIcon.textContent = '🔴';
    }
}

// Update status message (no longer displayed, but kept for error handling if needed)
function updateStatus(message, isRecording) {
    // Status no longer displayed in UI
}

// Update current text display - kept for compatibility but logic moved to onresult
function updateCurrentText(displayText) {
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    currentTextEl.value = displayText || '';
    lastDisplayText = displayText || '';
    updateSendButtonState();
}

// Update send button state based on textarea content
function updateSendButtonState() {
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn && currentTextEl) {
        const hasText = currentTextEl.value.trim().length > 0;
        sendBtn.disabled = !hasText;
    }
}

// Add message to chat window
function addMessageToChat(text) {
    if (!text.trim()) return;
    
    const chatWindow = document.getElementById('chatWindow');
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    
    // Add message to the end (bottom) of chat
    // Clear button is absolutely positioned, so it stays at top regardless of DOM order
    chatWindow.appendChild(messageDiv);
    
    // Scroll to bottom to show the newest message
    requestAnimationFrame(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
}

// Start recording
function startRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser.');
        return;
    }
    
    if (isRecording) {
        return;
    }
    
    // Reset accumulated text and tracking for new recording session
    accumulatedText = '';
    lastProcessedIndex = -1;
    lastInterimText = '';
    lastDisplayText = '';
    
    // Cache textarea element
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    
    // Start recognition - the Speech Recognition API will automatically request
    // microphone permission when needed. We don't need to request it explicitly
    // with getUserMedia, as that causes a duplicate permission prompt.
    // The API handles permission requests gracefully and remembers them in production (HTTPS).
    try {
        recognition.start();
        updateStatus('Starting...', true);
        
        // Focus the textarea after starting recording so Enter key works for sending
        setTimeout(() => {
            if (currentTextEl) {
                currentTextEl.focus();
            }
        }, 100);
    } catch (e) {
        // Handle different error cases
        if (e.message && e.message.includes('already started')) {
            // Already started, that's fine
            return;
        }
        
        // Check for permission-related errors
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || 
            e.message && e.message.includes('not allowed') || 
            e.message && e.message.includes('permission denied')) {
            console.error('Microphone permission denied:', e);
            updateUI(false);
            isRecording = false;
            alert('Microphone access is required for speech recognition. Please allow microphone access and try again.');
        } else {
            console.error('Error starting recognition:', e);
            updateStatus('Error starting recognition', false);
        }
    }
}

// Stop recording
function stopRecording() {
    if (!recognition || !isRecording) {
        return;
    }
    
    isRecording = false;
    recognition.stop();
    // Don't clear text when stopping - user can still send it
    updateStatus('Stopped', false);
}

// Send current text to chat - sends whatever is in the textarea
function sendToChat() {
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    const textToSend = currentTextEl.value.trim();
    if (!textToSend) {
        return; // Don't send empty messages
    }
    
    // Add to chat window
    addMessageToChat(textToSend);
    
    // Clear everything after sending
    accumulatedText = '';
    lastProcessedIndex = -1;
    lastInterimText = '';
    lastDisplayText = '';
    currentTextEl.value = '';
    updateSendButtonState();
}

// Clear current text
function clearCurrentText() {
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    accumulatedText = '';
    lastProcessedIndex = -1;
    lastInterimText = '';
    lastDisplayText = '';
    currentTextEl.value = '';
    updateSendButtonState();
    currentTextEl.focus(); // Keep focus on textarea
}

// Show clear chat popup
function showClearChatPopup() {
    const popup = document.getElementById('clearChatPopup');
    if (popup) {
        popup.classList.add('show');
    }
}

// Hide clear chat popup
function hideClearChatPopup() {
    const popup = document.getElementById('clearChatPopup');
    if (popup) {
        popup.classList.remove('show');
    }
}

// Clear chat
function clearChat() {
    const chatWindow = document.getElementById('chatWindow');
    // Clear all messages but keep the clear button
    const clearBtn = document.getElementById('clearChatBtn');
    chatWindow.innerHTML = '';
    if (clearBtn) {
        chatWindow.appendChild(clearBtn);
    }
    hideClearChatPopup();
}

// Toggle recording
function toggleRecording(e) {
    // Prevent event if it was triggered by keyboard on a button
    if (e && e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') {
        return;
    }
    
    if (e && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
    
    // Always focus textarea after toggling
    setTimeout(() => {
        if (!currentTextEl) {
            currentTextEl = document.getElementById('currentText');
        }
        if (currentTextEl) {
            currentTextEl.focus();
        }
    }, 50);
}

// Event listeners
const recordToggleBtn = document.getElementById('recordToggleBtn');
recordToggleBtn.addEventListener('click', (e) => {
    toggleRecording(e);
    // Immediately focus textarea after clicking button so Enter key works for sending
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    setTimeout(() => {
        if (currentTextEl) {
            currentTextEl.focus();
        }
    }, 10);
});

document.getElementById('clearBtn').addEventListener('click', clearCurrentText);
document.getElementById('sendBtn').addEventListener('click', sendToChat);

// Initialize textarea element cache and set up event listeners
if (!currentTextEl) {
    currentTextEl = document.getElementById('currentText');
}

// Listen for textarea input to update send button state
if (currentTextEl) {
    currentTextEl.addEventListener('input', updateSendButtonState);
    
    // Allow Enter key to send (Shift+Enter for new line)
    currentTextEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Make sure textarea is the active element
            if (document.activeElement === currentTextEl) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const sendBtn = document.getElementById('sendBtn');
                const textValue = currentTextEl.value.trim();
                
                // Only send if there's text and send button is enabled
                if (textValue && !sendBtn.disabled) {
                    sendToChat();
                    // Keep focus on textarea after sending
                    setTimeout(() => {
                        if (currentTextEl) {
                            currentTextEl.focus();
                        }
                    }, 10);
                }
                return false;
            }
        }
    }, true); // Use capture phase to ensure we handle it first
}

// Drag and resize functionality for container
let isDragging = false;
let isResizing = false;
let resizeDirection = null;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;
let initialWidth = 0;
let initialHeight = 0;
let initialMouseX = 0;
let initialMouseY = 0;
let initialRightEdge = 0;
let initialLeftEdge = 0;
let initialBottomEdge = 0;
let initialTopEdge = 0;
let initialContainerCenterX = 0;
let initialContainerCenterY = 0;
let container = null;
let containerWrapper = null;
let currentZoom = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const RESIZE_THRESHOLD = 10; // pixels from edge to trigger resize

// Check if the clicked element is interactive (button, textarea, etc.)
function isInteractiveElement(element) {
    if (!element) return false;
    
    const interactiveTags = ['BUTTON', 'TEXTAREA', 'INPUT', 'A', 'SELECT'];
    if (interactiveTags.includes(element.tagName)) {
        return true;
    }
    
    // Check if it's inside an interactive element
    if (element.closest('button, textarea, input, a, select')) {
        return true;
    }
    
    return false;
}

// Check if mouse is near a resize edge
function getResizeDirection(e, container) {
    if (!container) return null;
    
    // Get mouse position relative to viewport
    const clientX = e.type === 'touchstart' || e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' || e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Get container's bounding rectangle
    const rect = container.getBoundingClientRect();
    
    // Calculate distance from mouse to each edge
    const distToLeft = clientX - rect.left;
    const distToRight = rect.right - clientX;
    const distToTop = clientY - rect.top;
    const distToBottom = rect.bottom - clientY;
    
    // Check if mouse is near any edge (within threshold)
    const nearLeft = distToLeft >= 0 && distToLeft <= RESIZE_THRESHOLD;
    const nearRight = distToRight >= 0 && distToRight <= RESIZE_THRESHOLD;
    const nearTop = distToTop >= 0 && distToTop <= RESIZE_THRESHOLD;
    const nearBottom = distToBottom >= 0 && distToBottom <= RESIZE_THRESHOLD;
    
    // Also check if mouse is outside container but very close to edge
    const outsideButNearLeft = distToLeft < 0 && distToLeft >= -RESIZE_THRESHOLD;
    const outsideButNearRight = distToRight < 0 && distToRight >= -RESIZE_THRESHOLD;
    const outsideButNearTop = distToTop < 0 && distToTop >= -RESIZE_THRESHOLD;
    const outsideButNearBottom = distToBottom < 0 && distToBottom >= -RESIZE_THRESHOLD;
    
    // Corner resize (prioritize corners)
    if ((nearTop || outsideButNearTop) && (nearLeft || outsideButNearLeft)) return 'nw';
    if ((nearTop || outsideButNearTop) && (nearRight || outsideButNearRight)) return 'ne';
    if ((nearBottom || outsideButNearBottom) && (nearLeft || outsideButNearLeft)) return 'sw';
    if ((nearBottom || outsideButNearBottom) && (nearRight || outsideButNearRight)) return 'se';
    
    // Edge resize
    if (nearLeft || outsideButNearLeft) return 'w';
    if (nearRight || outsideButNearRight) return 'e';
    if (nearTop || outsideButNearTop) return 'n';
    if (nearBottom || outsideButNearBottom) return 's';
    
    return null;
}

// Update cursor based on resize direction
function updateResizeCursor(e, container) {
    if (!container || isDragging || isResizing) return;
    
    // Check resize direction first (takes priority)
    // This is based on mouse position, not event target
    const direction = getResizeDirection(e, container);
    
    if (direction) {
        // Show resize cursor when near edges, even if over child elements
        // But give interactive elements priority for their default cursors
        const isOnInteractive = isInteractiveElement(e.target) || 
                                e.target.closest('button, textarea, input, .btn-clear-chat');
        
        if (isOnInteractive) {
            // Check if very close to edge - if so, show resize cursor
            const rect = container.getBoundingClientRect();
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            const distToLeft = Math.abs(clientX - rect.left);
            const distToRight = Math.abs(clientX - rect.right);
            const distToTop = Math.abs(clientY - rect.top);
            const distToBottom = Math.abs(clientY - rect.bottom);
            
            const veryCloseToEdge = distToLeft <= 5 || distToRight <= 5 || 
                                    distToTop <= 5 || distToBottom <= 5;
            
            // If very close to edge, show resize cursor even over interactive elements
            if (!veryCloseToEdge) {
                // Not close enough to edge, keep default cursor for interactive elements
                return;
            }
        }
        
        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize',
            'n': 'n-resize',
            's': 's-resize',
            'e': 'e-resize',
            'w': 'w-resize'
        };
        container.style.cursor = cursors[direction] || 'default';
        // Also set cursor on document body to ensure it shows
        document.body.style.cursor = cursors[direction] || 'default';
        return;
    }
    
    // Reset body cursor if not resizing
    document.body.style.cursor = '';
    
    // Not near a resize edge - check if we should show move cursor
    // Don't update cursor if over interactive elements or input area
    if (isInteractiveElement(e.target) || 
        e.target.closest('.message') || 
        e.target.closest('.text-input-container') ||
        e.target.closest('button') ||
        e.target.closest('.btn-clear-chat')) {
        container.style.cursor = 'default';
        return;
    }
    
    // Show move cursor for draggable areas (chat window background)
    const chatWindow = document.getElementById('chatWindow');
    if (e.target === chatWindow || (container.contains(e.target) && !e.target.closest('.message') && !e.target.closest('.text-input-container'))) {
        container.style.cursor = 'move';
    } else {
        container.style.cursor = 'default';
    }
}

function dragStart(e) {
    if (!container) return;
    
    // Check if we're resizing FIRST (priority over everything else)
    // This check is based on mouse position relative to container, not event target
    const direction = getResizeDirection(e, container);
    if (direction) {
        // Allow resize when near edges, even if clicking on child elements
        // But prevent resize if clicking directly on buttons (clear chat, record, send, etc.)
        const isOnButton = e.target.closest('button') && 
                          !e.target.closest('.btn-clear-chat'); // Allow clear chat button area
        
        // If clicking on a button (except clear chat), don't resize
        // This allows normal button functionality
        if (isOnButton && e.target.tagName === 'BUTTON') {
            return; // Let button handle its own click
        }
        
        // Start resizing - prevent default to stop text selection, textarea resize, etc.
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Focus container to prevent textarea from getting focus
        container.focus();
        
        isResizing = true;
        resizeDirection = direction;
        container.classList.add('resizing');
        
        // Store initial container dimensions and position
        initialWidth = container.offsetWidth;
        initialHeight = container.offsetHeight;
        const rect = container.getBoundingClientRect();
        initialMouseX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        initialMouseY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        // Store initial edge positions - the opposite edge stays fixed during resize
        if (direction.includes('w')) {
            // For left resize, store the right edge position (this stays fixed)
            initialRightEdge = rect.right;
        }
        if (direction.includes('e')) {
            // For right resize, store the left edge position (this stays fixed)
            initialLeftEdge = rect.left;
        }
        if (direction.includes('n')) {
            // For top resize, store the bottom edge position (this stays fixed)
            initialBottomEdge = rect.bottom;
        }
        if (direction.includes('s')) {
            // For bottom resize, store the top edge position (this stays fixed)
            initialTopEdge = rect.top;
        }
        
        // Store initial center position for reference
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        initialContainerCenterX = rect.left + rect.width / 2;
        initialContainerCenterY = rect.top + rect.height / 2;
        
        return;
    }
    
    // Not resizing - check for dragging
    // Don't start dragging if clicking on interactive elements
    if (isInteractiveElement(e.target)) {
        return;
    }
    
    // Don't drag if clicking on clear chat button
    if (e.target.closest('.btn-clear-chat')) {
        return;
    }
    
    // Don't drag if clicking on messages
    if (e.target.closest('.message')) {
        return;
    }
    
    // Allow dragging from chat window background or container background
    const chatWindow = document.getElementById('chatWindow');
    const isChatWindowBackground = e.target === chatWindow;
    const isContainerBackground = e.target === container || 
                                  (container && e.target.closest('.container') && 
                                   !e.target.closest('.message') && 
                                   !e.target.closest('.text-input-container') &&
                                   !e.target.closest('.btn-clear-chat') &&
                                   !isInteractiveElement(e.target));
    
    if (!isChatWindowBackground && !isContainerBackground) {
        return;
    }
    
    if (e.type === 'touchstart') {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
    } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }
    
    isDragging = true;
    container.classList.add('dragging');
}

function dragEnd(e) {
    if (isDragging) {
        initialX = currentX;
        initialY = currentY;
    }
    isDragging = false;
    isResizing = false;
    if (container) {
        container.classList.remove('dragging');
        container.classList.remove('resizing');
        if (resizeDirection) {
            resizeDirection = null;
        }
    }
}

function drag(e) {
    if (!container) return;
    
    e.preventDefault();
    
    // Handle resizing (priority over dragging)
    if (isResizing && resizeDirection) {
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - initialMouseX;
        const deltaY = clientY - initialMouseY;
        
        // Get computed min/max dimensions
        const computedStyle = getComputedStyle(container);
        const minWidth = parseInt(computedStyle.minWidth) || 300;
        const minHeight = parseInt(computedStyle.minHeight) || 400;
        const maxWidth = parseInt(computedStyle.maxWidth) || Math.floor(window.innerWidth * 0.9);
        const maxHeight = parseInt(computedStyle.maxHeight) || Math.floor(window.innerHeight * 0.9);
        
        let newWidth = initialWidth;
        let newHeight = initialHeight;
        let deltaXOffset = 0;
        let deltaYOffset = 0;
        
        // Calculate new dimensions based on resize direction
        // For each direction, we keep the opposite edge fixed
        if (resizeDirection.includes('e')) {
            // Resize from east (right) edge - keep left edge fixed
            newWidth = Math.max(minWidth, Math.min(maxWidth, clientX - initialLeftEdge));
        }
        if (resizeDirection.includes('w')) {
            // Resize from west (left) edge - keep right edge fixed
            newWidth = Math.max(minWidth, Math.min(maxWidth, initialRightEdge - clientX));
        }
        
        if (resizeDirection.includes('s')) {
            // Resize from south (bottom) edge - keep top edge fixed
            newHeight = Math.max(minHeight, Math.min(maxHeight, clientY - initialTopEdge));
        }
        if (resizeDirection.includes('n')) {
            // Resize from north (top) edge - keep bottom edge fixed
            newHeight = Math.max(minHeight, Math.min(maxHeight, initialBottomEdge - clientY));
        }
        
        // Apply new size first (this will change the container dimensions)
        container.style.width = newWidth + 'px';
        container.style.height = newHeight + 'px';
        
        // Force a reflow to ensure the size change is applied
        container.offsetHeight;
        
        // Get viewport center for position calculations
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        
        // Calculate new container center position to keep the fixed edge in place
        // For ALL resize directions, we need to adjust position to keep the opposite edge fixed
        let newCenterX = initialContainerCenterX;
        let newCenterY = initialContainerCenterY;
        
        if (resizeDirection.includes('w')) {
            // Left resize: right edge stays fixed at initialRightEdge
            newCenterX = initialRightEdge - newWidth / 2;
        } else if (resizeDirection.includes('e')) {
            // Right resize: left edge stays fixed at initialLeftEdge
            newCenterX = initialLeftEdge + newWidth / 2;
        }
        
        if (resizeDirection.includes('n')) {
            // Top resize: bottom edge stays fixed at initialBottomEdge
            newCenterY = initialBottomEdge - newHeight / 2;
        } else if (resizeDirection.includes('s')) {
            // Bottom resize: top edge stays fixed at initialTopEdge
            newCenterY = initialTopEdge + newHeight / 2;
        }
        
        // Calculate offsets from viewport center
        const newXOffset = newCenterX - viewportCenterX;
        const newYOffset = newCenterY - viewportCenterY;
        
        // Update offsets and apply transform
        xOffset = newXOffset;
        yOffset = newYOffset;
        setTranslate(xOffset, yOffset, container);
        
        // Update initial values for continuous resizing
        initialWidth = newWidth;
        initialHeight = newHeight;
        initialContainerCenterX = newCenterX;
        initialContainerCenterY = newCenterY;
        
        return;
    }
    
    // Handle dragging
    if (!isDragging) return;
    
    if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
    } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
    }
    
    xOffset = currentX;
    yOffset = currentY;
    
    setTranslate(currentX, currentY, container);
}

function setTranslate(xPos, yPos, el) {
    if (el && containerWrapper) {
        containerWrapper.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
    }
}

// Zoom functionality
function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
        currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
        applyZoom();
    }
}

function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
        applyZoom();
    }
}

function applyZoom() {
    if (container) {
        // Apply zoom as scale transform
        container.style.transform = `scale(${currentZoom})`;
        updateZoomButtons();
    }
}

function updateZoomButtons() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
    }
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    initSpeechRecognition();
    
    // Initialize send button state based on current textarea content
    // Cache textarea element first if needed
    if (!currentTextEl) {
        currentTextEl = document.getElementById('currentText');
    }
    updateSendButtonState();
    
    // Get container and wrapper
    container = document.getElementById('container');
    containerWrapper = document.querySelector('.container-wrapper');
    
    if (container && containerWrapper) {
        // Reset container position to center on load
        xOffset = 0;
        yOffset = 0;
        setTranslate(0, 0, containerWrapper);
        
        // Initialize zoom
        applyZoom();
        
        // Initialize drag/resize handlers on container using capture phase
        // This allows us to catch events before they reach child elements
        container.addEventListener('mousedown', dragStart, true);
        container.addEventListener('touchstart', dragStart, true);
    }
    
    // Also listen for mousedown on document to catch clicks outside container (for border resize)
    document.addEventListener('mousedown', (e) => {
        if (!container) return;
        
        // Don't interfere with zoom buttons
        if (e.target.closest('.zoom-controls')) {
            return;
        }
        
        // Check if clicking near container borders (for resize from outside)
        const direction = getResizeDirection(e, container);
        if (direction && !isDragging && !isResizing) {
            // Only handle if not clicking on interactive elements
            if (!isInteractiveElement(e.target) && !e.target.closest('button, textarea, input')) {
                dragStart(e);
            }
        }
    }, true);
    
    // Zoom button event listeners
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomIn();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomOut();
        });
    }
    
    // Global mouse move handler for drag/resize and cursor updates
    // This ensures resize detection works even when mouse is over child elements
    document.addEventListener('mousemove', (e) => {
        if (isDragging || isResizing) {
            drag(e);
        } else if (container) {
            // Always update cursor based on mouse position relative to container
            // This works regardless of what element is under the mouse
            updateResizeCursor(e, container);
        }
    }, true); // Use capture phase
    
    document.addEventListener('touchmove', drag, true);
    document.addEventListener('mouseup', dragEnd, true);
    document.addEventListener('touchend', dragEnd, true);
    
    // Clear chat button event listener
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering drag
            showClearChatPopup();
        });
    }
    
    // Popup button event listeners
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', hideClearChatPopup);
    }
    
    const confirmClearBtn = document.getElementById('confirmClearBtn');
    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', clearChat);
    }
    
    // Close popup when clicking outside
    const popupOverlay = document.getElementById('clearChatPopup');
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                hideClearChatPopup();
            }
        });
    }
    
    // Close popup with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideClearChatPopup();
        }
    });
    
    // Note: We don't request microphone permission on page load
    // Permission will be requested automatically when user clicks the record button
    // This provides better UX and permission persistence in production (HTTPS)
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRecording) {
        // Pause recording when tab is hidden (optional)
        // stopRecording();
    }
});

