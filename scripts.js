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

function saveResponseToDB(question, answer) {
    const transaction = db.transaction(["responses"], "readwrite");
    const objectStore = transaction.objectStore("responses");
    objectStore.put({ question, answer });
}

function loadResponses() {
    const transaction = db.transaction(["responses"], "readonly");
    const objectStore = transaction.objectStore("responses");

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            responses[cursor.key] = cursor.value.answer;
            cursor.continue();
        }
        displayResponseBank(); // Garante que o banco é exibido uma vez que as respostas são carregadas
    };
}

function updateResponseInDB(question, answer) {
    saveResponseToDB(question, answer);
}

// Event Listener for Sending Messages
sendButton.addEventListener("click", () => {
    const userInput = inputField.value.trim();
    if (userInput) {
        addMessage(userInput, 'user');
        inputField.value = '';
        loadingIndicator.style.display = 'inline'; // Exibe indicador de carregamento

        // Verifica se é uma pergunta
        if (userInput.includes('?')) {
            // Se for uma pergunta, verifica se já existe uma resposta salva
            if (responses[userInput]) {
                const botResponse = responses[userInput];
                addMessage(botResponse, 'bot');
            } else {
                // Pede uma nova resposta se for uma pergunta
                const newResponse = prompt("Não conheço a resposta para isso. Por favor, insira uma resposta:");
                if (newResponse && newResponse.trim() !== "") {
                    responses[userInput] = newResponse.trim();
                    addMessage(newResponse.trim(), 'bot');
                    saveResponseToDB(userInput, newResponse.trim());
                } else {
                    addMessage("Desculpe, não tenho uma resposta agora.", 'bot');
                }
            }
        } else {
            // Se não for uma pergunta, responde com um dos neutros
            const botResponse = neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
            addMessage(botResponse, 'bot');
        }

        loadingIndicator.style.display = 'none'; // Oculta indicador de carregamento
    }
});

// Function to add a message to the chat
function addMessage(text, sender) {
    const messageElement = document.createElement("li");
    messageElement.classList.add("message", sender);
    messageElement.textContent = text;
    messageList.appendChild(messageElement);
    messageList.scrollTop = messageList.scrollHeight;
}

// Toggle Response Bank
responseToggle.addEventListener("click", () => {
    if (responseBank.style.display === "none" || !responseBank.style.display) {
        responseBank.style.display = "block";
        toggleIcon.style.transform = "rotate(180deg)";
    } else {
        responseBank.style.display = "none";
        toggleIcon.style.transform = "rotate(0deg)";
    }
});

// Display responses in response bank
function displayResponseBank() {
    responseBank.innerHTML = ''; // Limpa o conteúdo atual
    Object.keys(responses).forEach(question => {
        const responseItem = document.createElement("div");
        responseItem.classList.add("responseItem");
        responseItem.textContent = `${question}: ${responses[question]}`;

        const editButton = document.createElement("button");
        editButton.classList.add("editResponse");
        editButton.textContent = "Editar";
        editButton.onclick = function () {
            const newAnswer = prompt("Digite a nova resposta:", responses[question]);
            if (newAnswer && newAnswer.trim() !== "") {
                responses[question] = newAnswer.trim();
                updateResponseInDB(question, newAnswer.trim());
                displayResponseBank();
            }
        };

        responseItem.appendChild(editButton);
        responseBank.appendChild(responseItem);
    });
}
