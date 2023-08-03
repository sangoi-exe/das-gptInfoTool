let pageId = null,
	startTime = null,
	gptModel = null,
	chatModel = null,
	infoDisplay = null,
	modelUrl = null;

let messageCount = 0;
let tokenCount = 0;
let tokenCounts = {};
const gpt4Models = ["gpt-4", "gpt-4-plugins", "gpt-4-code-interpreter"];
let modelTokenLimits = {
	"gpt-4": 4095,
	"gpt-4-code-interpreter": 8192,
	"gpt-4-plugins": 8192,
	"text-davinci-002-render-sha": 8191,
};

async function main() {
	window.addEventListener("message", async (event) => {
		if (event.source !== window || event.data.source !== "Tampermonkey") {
			return;
		}

		switch (event.data.data) {
			case "urlWithGet":
				await urlInGet();
				break;
			case "fetchDone":
				await handleChatInfo();
				break;
		}
	});
}

async function handleChatInfo() {
	pageId = window.localStorage.getItem("[das]_apiChatId");
	gptModel = window.localStorage.getItem("[das]_lastModelUsed");
	localStorage.setItem(`[das]_model_${pageId}`, gptModel);
	chatModel = localStorage.getItem(`[das]_model_${pageId}`);
	await checkCapInterval();
	await handleCapStartTime();
	await handleSentMessage();
}

async function urlInGet() {
	let getUrl = window.localStorage.getItem("[das]_apiUrlId");
	let splitUrl = getUrl.split("/conversation/");
	pageId = splitUrl[1];
}

async function handleCapStartTime() {
	if (startTime !== null && !gpt4Models.includes(chatModel)) {
		return;
	} else {
		startTime = new Date().toISOString();
		localStorage.setItem("[das]_capStartTime", startTime);
	}
}

async function checkCapInterval() {
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

async function handleSentMessage() {
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
	await updateInfoDisplay();
}

async function updateInfoDisplay() {
	messageCount = parseInt(localStorage.getItem(`[das]_messageCount`)) || 0;
	tokenCounts = JSON.parse(localStorage.getItem(`[das]_tokenCounts_${pageId}`)) || {};

	await handleInfoDisplay();

	if (gpt4Models.includes(chatModel)) {
		if (startTime !== null) {
			infoDisplay.innerHTML = `Start Time: ${formatDateTime(
				startTime
			)}<br>Message Count: ${messageCount}<br>Total Tokens: ${
				tokenCounts[pageId] || 0
			}<br><span id="das-token">Tokens Count: 0</span>`;
		} else {
			infoDisplay.innerHTML = `Start Time: -<br>Message Count: ${messageCount}<br>Total Tokens: ${
				tokenCounts[pageId] || 0
			}<br><span id="das-token">Tokens Count: 0</span>`;
		}
	} else {
		infoDisplay.innerHTML = `Start Time: -<br>Message Count: -<br>Total Tokens: ${
			tokenCounts[pageId] || 0
		}<br><span id="das-token">Tokens Count: 0</span>`;
	}
	mainObserver.observe(document.body, { childList: true, subtree: true });
}

async function handleInfoDisplay() {
	infoDisplay = document.querySelector("#info-display");
	if (infoDisplay) {
		return;
	}
	infoDisplay = document.createElement("div");
	infoDisplay.innerHTML = `Start Time: -<br>Message Count: -<br>Total Tokens: ${
		tokenCounts[pageId] || 0
	}<br><span id="das-token">Tokens Count: -</span>`;
	infoDisplay.id = "info-display";
	infoDisplay.className = "flex flex-col relative justify-end h-auto text-xs pb-0";

	let textArea = document.querySelector('[role="presentation"]');
	textArea.insertAdjacentElement("afterend", infoDisplay);
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

async function checkModelUrl() {
	modelUrl = window.location.href;
	if (modelUrl.includes("model=")) {
		let splitFetch = modelUrl.split("model=");
		chatModel = splitFetch[1];
	} else if (modelUrl === "https://chat.openai.com/") {
		chatModel = "text-davinci-002-render-sha";
	} else if (modelUrl.includes("/c/")) {
		return;
	}
}

let modelCheck = new MutationObserver(async function (mutations) {
	let newModelUrl = window.location.href;
	if (newModelUrl !== modelUrl) {
		await checkModelUrl();
	}
});

modelCheck.observe(document.body, { childList: true, subtree: true });

let mainObserver = new MutationObserver((mutationsList, observer) => {
	let textArea = document.querySelector("#prompt-textarea");
	let formPrompt = document.querySelector("form.stretch");
	let tokenLimit = modelTokenLimits[chatModel];
	handleInfoDisplay();
	if (textArea && formPrompt) {
		let tokenTag = document.querySelector("span#das-token");
		textArea.addEventListener("input", async function () {
			if (textArea.value.length !== 0) {
				tokenCount = await countTokens(textArea.value);
				tokenTag.innerHTML = "Tokens Count: " + tokenCount;

				if (tokenCount > tokenLimit) {
					textArea.style.color = "red";
				} else {
					textArea.style.color = "white";
				}
			} else if (textArea.value.length === 0) {
				tokenTag.innerText = "Tokens Count: 0";
			}
		});

		formPrompt.addEventListener("keydown", function (event) {
			if (event.key === "Enter" && !event.shiftKey) {
				if (textArea.value.length > 1) {
					if (tokenCount > tokenLimit) {
						event.stopImmediatePropagation();
					}
				}
			}
		});

		mainObserver.disconnect();
	}
});

mainObserver.observe(document.body, { childList: true, subtree: true });

function loadCheck() {
	let tabUrl = window.location.href;
	if (tabUrl.includes("/c/")) {
		let splitUrl = tabUrl.split("/c/");
		pageId = splitUrl[1];
	}
}

loadCheck();
checkModelUrl();
main();
