document.getElementById("save-note").addEventListener("click", () => {
    const note = document.getElementById("custom-note").value;
    chrome.storage.local.set({ customNote: note }, () => {
        addStatusMessage("Custom note saved successfully!", "success");
    });
});

document.getElementById("send-connection").addEventListener("click", () => {
    chrome.storage.local.get("customNote", (data) => {
        const note = data.customNote || "Hi, I'd like to connect with you!";
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: automateLinkedInConnection,
                args: [note],
            });
        });
    });
});

function addStatusMessage(message, statusClass) {
    const statusList = document.getElementById("status-list");
    const li = document.createElement("li");
    li.textContent = message;
    li.classList.add(statusClass);
    statusList.appendChild(li);
}

function automateLinkedInConnection(note) {
    const connectButtons = Array.from(document.querySelectorAll('button[aria-label*="Connect"], button[aria-label*="Invite"]'));
    if (!connectButtons.length) {
        chrome.runtime.sendMessage({ type: "status", message: "No Connect buttons found!", statusClass: "error" });
        return;
    }

    let index = 0;

    function processNextConnection() {
        if (index >= connectButtons.length) {
            chrome.runtime.sendMessage({ type: "status", message: "All connection requests processed.", statusClass: "success" });
            return;
        }

        const connectButton = connectButtons[index];
        chrome.runtime.sendMessage({ type: "status", message: `Processing user ${index + 1}...`, statusClass: "processing" });

        // Click the "Connect" button
        connectButton.click();

        setTimeout(() => {
            const noteTextarea = document.querySelector('textarea[name="message"].connect-button-send-invite__custom-message');
            if (!noteTextarea) {
                chrome.runtime.sendMessage({ type: "status", message: `Skipping user ${index + 1} (textarea not found).`, statusClass: "error" });
                index++;
                setTimeout(processNextConnection, 5000);
                return;
            }

            noteTextarea.value = note;

            const sendButton = document.querySelector('button.artdeco-button--primary[aria-label="Send invitation"]');
            if (!sendButton) {
                chrome.runtime.sendMessage({ type: "status", message: `Skipping user ${index + 1} (send button not found).`, statusClass: "error" });
                index++;
                setTimeout(processNextConnection, 5000);
                return;
            }

            sendButton.click();
            chrome.runtime.sendMessage({ type: "status", message: `Request sent to user ${index + 1}.`, statusClass: "success" });

            index++;
            setTimeout(processNextConnection, 5000);
        }, 2000);
    }

    processNextConnection();
}

// Listen for messages from the content script to update the status list
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "status") {
        addStatusMessage(message.message, message.statusClass);
    }
});
