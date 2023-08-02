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
		let globalData;
		
		window.fetch = function (...args) {
			return originalFetch.apply(this, args).then(async (response) => {
				apiArgs = args;
				apiResponse = response.clone();
				if (apiArgs && apiResponse) {
					await getSentMsg();
					await getApiResponse();
				}
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
			} else if (
				apiArgs[1].method === "GET" &&
				apiArgs[0].includes("https://chat.openai.com/backend-api/conversation/") &&
				!apiArgs[0].includes("/interpreter")
			) {
				apiUrlId = apiArgs[0];
				window.localStorage.setItem("[das]_apiUrlId", apiUrlId);
				window.postMessage({ source: "Tampermonkey", data: "urlWithGet" }, "*");
			}
		}
		
		async function getApiResponse() {
			apiResponse
				.clone()
				.text()
				.then((data) => {
					globalData = data;
					const lines = data.split("\\n");
					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const json = line.slice(6);
							if (json.startsWith('{"message":')) {
								let parsedData = JSON.parse(json);
								let isComplete = parsedData.message?.metadata?.is_complete;
								if (isComplete) {
									apiChatId = parsedData.conversation_id;
									apiModel = parsedData.message.metadata.model_slug;
									switch (parsedData.message.content.content_type) {
										case "text":
											apiFullMsg = parsedData.message.content.parts[0];
											break;
										case "code":
										case "execution_output":
											apiFullMsg = parsedData.message.content.text;
											break;
										default:
											console.log("UNKNOWN CONTENT TYPE:", parsedData.message.content.content_type);
											break;
									}
									window.localStorage.setItem("[das]_apiFullMsg", apiFullMsg);
									window.localStorage.setItem("[das]_apiChatId", apiChatId);
									window.localStorage.setItem("[das]_lastModelUsed", apiModel);
									window.postMessage({ source: "Tampermonkey", data: "fetchDone" }, "*");
								}
							}
						}
					}
				})
				.catch((error) => {
					console.log("ERRO LENDO ESSA CACETA:", error);
				});
		}	
	`;

	let script = document.createElement("script");
	script.textContent = scriptContent;
	(document.head || document.documentElement).appendChild(script);
	script.remove();
})();
