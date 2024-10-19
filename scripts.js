const inputField = document.getElementById("inputField");
const sendButton = document.getElementById("sendButton");
const messageList = document.getElementById("messageList");
const responseBank = document.getElementById("responseBank");
const loadingIndicator = document.getElementById("loadingIndicator");
const responseToggle = document.getElementById("responseToggle");
const toggleIcon = document.getElementById("toggleIcon");

let db;
let responses = {};

// Frases neutras para respostas desconhecidas
const neutralResponses = [
    "Interessante, vou pensar mais sobre isso.",
    "Obrigado por compartilhar!",
    "Hum, isso é válido.",
    "Entendo o que você está dizendo.",
    "Ok, anotado!"
];

// Configuração de busca Fuse.js
let fuse;

// Função para inicializar o Fuse.js
function initFuse() {
    fuse = new Fuse(Object.keys(responses), {
        includeScore: true,
        threshold: 0.3, // Ajuste para melhorar a correspondência
    });
}

// Abrindo o IndexedDB
const request = indexedDB.open("chatDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const objectStore = db.createObjectStore("responses", { keyPath: "question" });
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadResponses(); // Carregar respostas armazenadas
};

request.onerror = function(event) {
    console.error("Erro ao abrir o banco de dados: ", event.target.errorCode);
};

// Função para salvar uma nova resposta no IndexedDB
function saveResponseToDB(question, answer) {
    const transaction = db.transaction(["responses"], "readwrite");
    const objectStore = transaction.objectStore("responses");
    objectStore.put({ question, answer });
    responses[question] = answer; // Atualizar o objeto local
    initFuse(); // Atualizar o Fuse.js com novas respostas
}

// Função para carregar respostas armazenadas
function loadResponses() {
    const transaction = db.transaction(["responses"], "readonly");
    const objectStore = transaction.objectStore("responses");

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            responses[cursor.key] = cursor.value.answer;
            cursor.continue();
        }
        initFuse(); // Inicializar o Fuse.js após carregar as respostas
        displayResponseBank(); // Atualizar o banco de respostas visível
    };
}

// Evento para enviar uma mensagem
sendButton.addEventListener("click", function() {
    const userInput = inputField.value.trim();
    if (userInput) {
        addMessage(userInput, "user");
        processMessage(userInput);
    }
    inputField.value = "";
});

// Função para adicionar uma mensagem ao chat
function addMessage(text, sender) {
    const messageItem = document.createElement("li");
    messageItem.classList.add("message", sender);
    messageItem.textContent = text;
    messageList.appendChild(messageItem);
    messageList.scrollTop = messageList.scrollHeight; // Scroll automático para o fim do chat
}

// Função para processar a mensagem do usuário
function processMessage(input) {
    const searchResult = fuse.search(input);
    
    if (searchResult.length > 0) {
        const bestMatch = searchResult[0].item;
        addMessage(responses[bestMatch], "bot");
    } else {
        fetchDuckDuckGoAPI(input);
    }
}

// Função para buscar resposta na API DuckDuckGo
function fetchDuckDuckGoAPI(query) {
    loadingIndicator.style.display = "inline"; // Mostrar indicador de carregamento

    fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`)
        .then(response => response.json())
        .then(data => {
            loadingIndicator.style.display = "none"; // Esconder indicador de carregamento

            // Verificar se há uma resposta direta da API DuckDuckGo
            let botResponse = data.AbstractText || null;

            if (botResponse) {
                addMessage(botResponse, "bot");
                saveResponseToDB(query, botResponse); // Salvar resposta aprendida
            } else {
                // Se não houver resposta, usar uma resposta neutra
                botResponse = neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
                addMessage(botResponse, "bot");
            }
        })
        .catch(error => {
            loadingIndicator.style.display = "none";
            console.error("Erro ao buscar dados da API DuckDuckGo:", error);
            // Usar uma resposta neutra em caso de erro
            const botResponse = neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
            addMessage(botResponse, "bot");
        });
}

// Alternar visibilidade do banco de respostas
responseToggle.addEventListener("click", () => {
    if (responseBank.style.display === "none") {
        responseBank.style.display = "block";
        toggleIcon.style.transform = "rotate(180deg)";
    } else {
        responseBank.style.display = "none";
        toggleIcon.style.transform = "rotate(0deg)";
    }
});

// Mostrar banco de respostas armazenadas
function displayResponseBank() {
    responseBank.innerHTML = ""; // Limpar o banco atual
    for (const question in responses) {
        const responseItem = document.createElement("div");
        responseItem.classList.add("responseItem");
        responseItem.textContent = `${question} → ${responses[question]}`;
        responseBank.appendChild(responseItem);
    }
}
