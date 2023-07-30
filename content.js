let pageId = null;
let startTime = null;
let gptModel = null;
let chatModel = null;
let messageCount = 0;
let tokenCounts = {};
const gpt4Models = ['gpt-4', 'gpt-4-plugins', 'gpt-4-code-interpreter'];

async function main() {
	window.addEventListener("message", async (event) => {
		if (event.source != window) {
			return;
		}

		if (event.data.source && event.data.source == "Tampermonkey") {
			await getChatInfo();
			await updateInfoDisplay();
		}
	});
}

async function getChatInfo() {
	pageId = window.localStorage.getItem("[das]_apiChatId");
	gptModel = window.localStorage.getItem("[das]_lastModelUsed");
	localStorage.setItem(`[das]_model_${pageId}`, gptModel);
	chatModel = localStorage.getItem(`[das]_model_${pageId}`);
	await checkTimeInterval();
	await registerFirstMessageTime();
	await registerMessageSent();
}

async function registerFirstMessageTime() {
	if (startTime === null && gpt4Models.includes(chatModel)) {
		startTime = new Date().toISOString();
		localStorage.setItem("[das]_capStartTime", startTime);
	} else {
		return;
	}
}

async function checkTimeInterval() {
	if (gpt4Models.includes(chatModel)) {
		if (localStorage.getItem("[das]_capStartTime")) {
			startTime = new Date(localStorage.getItem("[das]_capStartTime"));
		} else {
			startTime = new Date();
			localStorage.setItem("[das]_capStartTime", startTime.toISOString());
		}

		if (!startTime) {
			return;
		}

		let currentTime = new Date();
		let timeDiff = currentTime.getTime() - startTime.getTime();
		let timeDiffInHours = Math.abs(timeDiff) / (1000 * 60 * 60);

		if (timeDiffInHours >= 3) {
			await resetCounts();
		}
	} else {
		return;
	}
}

async function registerMessageSent() {
	if (localStorage.getItem("[das]_messageCount")) {
		messageCount = localStorage.getItem("[das]_messageCount");
	} else {
		localStorage.setItem("[das]_messageCount", messageCount);
	}

	if (gpt4Models.includes(chatModel)) {
		messageCount++;
		localStorage.setItem(`[das]_messageCount`, messageCount);
	}

	let lastUserMsg = window.localStorage.getItem("[das]_lastUserMsg");
	let userTokens = await countTokens(lastUserMsg);
	tokenCounts[pageId] = (tokenCounts[pageId] || 0) + userTokens;
	localStorage.setItem(`[das]_tokenCounts_${pageId}`, JSON.stringify(tokenCounts));

	let apiFullMsg = window.localStorage.getItem("[das]_apiFullMsg");
	let apiTokens = await countTokens(apiFullMsg);
	tokenCounts[pageId] = (tokenCounts[pageId] || 0) + apiTokens;

	localStorage.setItem(`[das]_tokenCounts_${pageId}`, JSON.stringify(tokenCounts));
}

async function updateInfoDisplay() {
	messageCount = parseInt(localStorage.getItem(`[das]_messageCount`)) || 0;
	tokenCounts = JSON.parse(localStorage.getItem(`[das]_tokenCounts_${pageId}`)) || {};
	let infoDisplay = document.querySelector("#info-display");

	if (!infoDisplay) {
		infoDisplay = document.createElement("div");
		infoDisplay.id = "info-display";
		infoDisplay.className = "flex flex-col relative justify-end h-auto text-xs pb-1.5";
		let textArea = document.querySelector('[role="presentation"]');
		textArea.insertAdjacentElement("afterend", infoDisplay);
	}

	if (gpt4Models.includes(chatModel)) {
		if (startTime != null) {
			infoDisplay.innerText = `Start Time: ${formatDateTime(startTime)}\nMessage Count: ${messageCount}\nToken Count: ${
				tokenCounts[pageId] || 0
			}`;
		} else {
			infoDisplay.innerText = `Start Time: -\nMessage Count: ${messageCount}\nToken Count: ${tokenCounts[pageId] || 0}`;
		}
	} else {
		infoDisplay.innerText = `Start Time: -\nMessage Count: -\nToken Count: ${tokenCounts[pageId] || 0}`;
	}
}

async function countTokens(message) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ method: "encode", text: message }, function (response) {
			resolve(response.result.length);
		});
	});
}

async function resetCounts() {
	startTime = null;
	messageCount = 0;
	localStorage.setItem("[das]_capStartTime", startTime);
	localStorage.setItem(`[das]_messageCount`, messageCount);
}

function formatDateTime(dateTimeString) {
	let date = new Date(dateTimeString);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/*function objectComparison(obj1, obj2) {
	const result = {};

	for (let key in obj1) {
		if (!(key in obj2)) {
			result[key] = obj1[key];
		}
	}

	return result;
}*/

main();
