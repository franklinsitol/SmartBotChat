const inputField = document.getElementById("inputField");
const sendButton = document.getElementById("sendButton");
const messageList = document.getElementById("messageList");
const responseBank = document.getElementById("responseBank");
const loadingIndicator = document.getElementById("loadingIndicator");
const responseToggle = document.getElementById("responseToggle");
const toggleIcon = document.getElementById("toggleIcon");

let db;
let responses = {};

const neutralResponses = [
    "Interessante, vou pensar mais sobre isso.",
    "Obrigado por compartilhar!",
    "Hum, isso é válido.",
    "Entendo o que você está dizendo.",
    "Ok, anotado!"
];

// Fuse.js search setup
const fuse = new Fuse(Object.keys(responses), {
    includeScore: true,
    threshold: 0.3 // Customize this for better matching
});

// Open IndexedDB
const request = indexedDB.open("chatDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const objectStore = db.createObjectStore("responses", { keyPath: "question" });
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadResponses();
};

request.onerror = function(event) {
    console.error("Erro ao abrir o banco de dados: ", event.target.errorCode);
};

// Save response to IndexedDB
function saveResponseToDB(question, answer) {
    const transaction = db.transaction(["responses"], "readwrite");
    const objectStore = transaction.objectStore("responses");
    objectStore.put({ question, answer });
}

// Load responses from IndexedDB
function loadResponses() {
    const transaction = db.transaction(["responses"], "readonly");
    const objectStore = transaction.objectStore("responses");

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            responses[cursor.key] = cursor.value.answer;
            cursor.continue();
        }
        displayResponseBank(); // Ensure response bank is displayed
    };
}

// Event Listener for Sending a Message
sendButton.addEventListener("click", function() {
    const userInput = inputField.value.trim();
    if (userInput) {
        addMessage(userInput, "user");
        processMessage(userInput);
    }
    inputField.value = "";
});

// Display messages in the chat
function addMessage(text, sender) {
    const messageItem = document.createElement("li");
    messageItem.classList.add("message", sender);
    messageItem.textContent = text;
    messageList.appendChild(messageItem);
    messageList.scrollTop = messageList.scrollHeight; // Scroll to bottom
}

// Process the user input and generate a response
function processMessage(input) {
    const storedResponse = fuse.search(input);
    
    if (storedResponse.length > 0) {
        const bestMatch = storedResponse[0].item;
        addMessage(responses[bestMatch], "bot");
    } else {
        fetchDuckDuckGoAPI(input);
    }
}

// Fetch answer from DuckDuckGo API if no stored response found
function fetchDuckDuckGoAPI(query) {
    loadingIndicator.style.display = "inline";
    fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`)
        .then(response => response.json())
        .then(data => {
            loadingIndicator.style.display = "none";
            const botResponse = data.AbstractText || neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
            addMessage(botResponse, "bot");
            saveResponseToDB(query, botResponse); // Save to DB for future queries
        })
        .catch(error => {
            loadingIndicator.style.display = "none";
            console.error("Erro ao buscar dados da DuckDuckGo API:", error);
        });
}

// Toggle visibility of response bank
responseToggle.addEventListener("click", () => {
    if (responseBank.style.display === "none") {
        responseBank.style.display = "block";
        toggleIcon.style.transform = "rotate(180deg)";
    } else {
        responseBank.style.display = "none";
        toggleIcon.style.transform = "rotate(0deg)";
    }
});

// Display response bank dynamically
function displayResponseBank() {
    responseBank.innerHTML = ""; // Clear the current bank
    for (const question in responses) {
        const responseItem = document.createElement("div");
        responseItem.classList.add("responseItem");
        responseItem.textContent = `${question} → ${responses[question]}`;
        responseBank.appendChild(responseItem);
    }
}
