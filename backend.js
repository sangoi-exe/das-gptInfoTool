// ==UserScript==
// @name         ChatGPT Chat Monitor
// @namespace    ChatGPT
// @version      1.1
// @description  Monitors the OpenAI chat usage
// @author       DevArq.Sangoi
// @match        https://chat.openai.com/*
// ==/UserScript==

(function () {
	"use strict";
	const scriptContent = `
		const originalFetch = window.fetch;
		const OriginalAbortController = window.AbortController;
		let apiArgs;
		let apiModel;
		let apiChatId;
		let apiFullMsg;
		let apiResponse;
		let userMsg;

		window.fetch = function (...args) {
			return originalFetch.apply(this, args).then(async (response) => {
				apiArgs = args;
				apiResponse = response.clone();
				await getSentMsg();
				await getApiResponse();
				return response;
			});
		};

		window.AbortController = class extends OriginalAbortController {
			constructor(...args) {
				super(...args);
			}

			abort(...args) {
				return "nice try";
			}
		};

		async function getSentMsg() {
			if (apiArgs[1].method === "POST" && apiArgs[0] === "https://chat.openai.com/backend-api/conversation") {
				let argsToObj = JSON.parse(apiArgs[1].body);
				userMsg = argsToObj.messages[0].content.parts[0];
				window.localStorage.setItem("[das]_lastUserMsg", userMsg);
			}
		}

		async function getApiResponse() {
			apiResponse
				.clone()
				.text()
				.then((data) => {
					const lines = data.split("\\n");
					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const json = line.slice(6);
							if (json !== "[DONE]") {
								let parsedData = JSON.parse(json);
								let isComplete = parsedData.message?.metadata?.is_complete;
								if (isComplete) {
									apiChatId = parsedData.conversation_id;
									apiModel = parsedData.message.metadata.model_slug;
									apiFullMsg = parsedData.message.content.parts[0];
									window.localStorage.setItem("[das]_apiChatId", apiChatId);
									window.localStorage.setItem("[das]_lastModelUsed", apiModel);
									window.localStorage.setItem("[das]_apiFullMsg", apiFullMsg);
									if (userMsg) {
										window.postMessage({ source: "Tampermonkey", data: "fetchDone" }, "*");
									}
								}
							}
						}
					}
				})
				.catch((error) => {
					console.log("Error reading response:", error);
				});
		}
	`;

	let script = document.createElement("script");
	script.textContent = scriptContent;
	(document.head || document.documentElement).appendChild(script);
	script.remove();
})();