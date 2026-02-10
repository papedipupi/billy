// Updated app.js with new implementation

// Confirmation Modal Functionality
function showConfirmationModal(message, callback) {
    // Implementation of the confirmation modal
    const modal = document.createElement('div');
    modal.innerHTML = `<div>${message}</div><button id='confirm'>Confirm</button><button id='cancel'>Cancel</button>`;
    document.body.appendChild(modal);

    document.getElementById('confirm').onclick = function() {
        callback(true);
        document.body.removeChild(modal);
    };

    document.getElementById('cancel').onclick = function() {
        callback(false);
        document.body.removeChild(modal);
    };
}

// Tooltip Functionality
function showTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.innerText = message;
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top + window.scrollY}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    setTimeout(() => {
        document.body.removeChild(tooltip);
    }, 3000);
}

// Example usage of the new functionalities
showConfirmationModal('Are you sure you want to proceed?', (confirmed) => {
    if (confirmed) {
        console.log('Confirmed!');
    } else {
        console.log('Cancelled!');
    }
});

// Implementing the tooltip on hover
const exampleElement = document.getElementById('example');
exampleElement.onmouseover = () => showTooltip(exampleElement, 'This is a tooltip message!');