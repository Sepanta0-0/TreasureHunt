window.onload = () => {
    'use strict';
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./serviceWorker.js');
    }
}

function showTheMessage(message, isError = false) {
    const messageElement = document.getElementById('status-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    if (isError) {
        messageElement.style.color = 'red';
        messageElement.style.fontWeight = 'bold';
    } else {
        messageElement.style.color = 'green';
        messageElement.style.fontWeight = 'normal';
    }
}