let pageId = null;
let startTime = null;
let gptModel = null;
let chatModel = null;
let messageCount = 0;
let tokenCounts = {};

async function main() {
	window.addEventListener(
		"message",
		async (event) => {
			if (event.source != window) {
				return;
			}
			if (event.data.source && event.data.source == "Tampermonkey") {
				switch (event.data.data) {
					case "messageSent":
						await getMessage();
						await updateInfoDisplay();
						break;
					case "existingChat":
						await getChatInfo();
						await updateInfoDisplay();
						break;
					case "newChat":
						await getChatInfo();
						await getMessage();
						break;
				}
			}
		},
		false
	);
}

async function getChatInfo() {
	let apiChatId = window.localStorage.getItem("_apiChatId");
	let splitFetch;

	if (apiChatId.includes("/conversation/gen_title/")) {
		splitFetch = apiChatId.split("conversation/gen_title/");
	} else {
		splitFetch = apiChatId.split("/conversation/");
	}

	pageId = splitFetch[1];

	gptModel = window.localStorage.getItem("_lastModelUsed");
	localStorage.setItem(`_model_${pageId}`, gptModel);
	chatModel = localStorage.getItem(`_model_${pageId}`);
	startTime = localStorage.getItem("_startTime");

	await registerFirstMessageTime();
}

async function getMessage() {
	let lastUserMsg = window.localStorage.getItem("_lastUserMsg");

	await checkTimeInterval();
	await registerMessageSent(lastUserMsg);
}

async function registerFirstMessageTime() {
	if (startTime === null && chatModel == "gpt-4") {
		startTime = new Date().toISOString();
		localStorage.setItem("_startTime", startTime);
	}
}

async function registerMessageSent(message) {
	if (chatModel == "gpt-4") {
		messageCount++;
		localStorage.setItem(`_messageCount`, messageCount);
	}
	let tokenCount = await countTokens(message);
	tokenCounts[pageId] = (tokenCounts[pageId] || 0) + tokenCount;
	localStorage.setItem(`_tokenCounts_${pageId}`, JSON.stringify(tokenCounts));
	updateInfoDisplay();
}

async function countTokens(message) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ method: "encode", text: message }, function (response) {
			resolve(response.result.length);
		});
	});
}

async function checkTimeInterval() {
	if (startTime === null) {
		return;
	}
	let currentTime = new Date();
	let timeDiff = currentTime - new Date(startTime);
	let timeDiffInHours = timeDiff / (1000 * 60 * 60);
	if (timeDiffInHours >= 3 && chatModel == "gpt-4") {
		resetCounts();
	}
}

function resetCounts() {
	startTime = null;
	messageCount = 0;
	tokenCounts = {};
	localStorage.setItem("_startTime", startTime);
	localStorage.setItem(`_messageCount`, messageCount);
	localStorage.setItem(`_tokenCounts_${pageId}`, JSON.stringify(tokenCounts));
}

function formatDateTime(dateTimeString) {
	let date = new Date(dateTimeString);
	let hour = ("0" + (date.getUTCHours() - 3)).slice(-2);
	let minute = ("0" + date.getUTCMinutes()).slice(-2);

	return `${hour}:${minute}`;
}

async function updateInfoDisplay() {	
	messageCount = parseInt(localStorage.getItem(`_messageCount`)) || 0;
	tokenCounts = JSON.parse(localStorage.getItem(`_tokenCounts_${pageId}`)) || {};

	let infoDisplay = document.querySelector("#info-display");

	if (!infoDisplay) {
		infoDisplay = document.createElement("div");
		infoDisplay.id = "info-display";
		infoDisplay.className = "flex flex-col relative justify-end h-auto text-xs pb-1.5";
		let textArea = document.querySelector('[role="presentation"]');
		textArea.insertAdjacentElement("afterend", infoDisplay);
	}
	if (chatModel == "gpt-4") {
		infoDisplay.innerText = `Start Time: ${formatDateTime(startTime)}\nMessage Count: ${messageCount}\nToken Count: ${
			tokenCounts[pageId] || 0
		}`;
	} else {
		infoDisplay.innerText = `Start Time: -\nMessage Count: -\nToken Count: ${tokenCounts[pageId] || 0}`;
	}
}

function objectComparison(obj1, obj2) {
	const result = {};

	for (let key in obj1) {
		if (!(key in obj2)) {
			result[key] = obj1[key];
		}
	}

	return result;
}

main();
