// ==UserScript==
// @name         ChatGPT Chat Monitor
// @namespace    ChatGPT
// @version      1.0
// @description  Monitors the OpenAI chat usage
// @author       DevArq.Sangoi
// @match        https://chat.openai.com/*
// ==/UserScript==

(function () {
	"use strict";
	const scriptContent = `
    const originalFetch = window.fetch;
    let apiChatId;
    
    window.fetch = function (...args) {
        return originalFetch.apply(this, args).then((response) => {
            if (args[1].method === "GET" && args[0].includes("https://chat.openai.com/backend-api/conversation/")) {
                apiChatId = args[0];
                window.localStorage.setItem("_apiChatId", apiChatId);
                window.postMessage(
                    {
                        source: "Tampermonkey",
                        data: "existingChat",
                    },
                    "*"
                );
            } else if (args[1].method === "POST" && args[0] === "https://chat.openai.com/backend-api/conversation") {
                let backToObj = JSON.parse(args[1].body);
        
                if ("conversation_id" in backToObj) {
                    window.localStorage.setItem("_lastUserMsg", backToObj.messages[0].content.parts[0]);
                    window.localStorage.setItem("_lastModelUsed", backToObj.model);
                    window.postMessage(
                        {
                            source: "Tampermonkey",
                            data: "messageSent",
                        },
                        "*"
                    );
                } else {
                    window.localStorage.setItem("_lastUserMsg", backToObj.messages[0].content.parts[0]);
                    window.localStorage.setItem("_lastModelUsed", backToObj.model);
                }
            } else if (
                args[1].method === "POST" &&
                args[0].includes("https://chat.openai.com/backend-api/conversation/gen_title/")
            ) {
                apiChatId = args[0];
                window.localStorage.setItem("_apiChatId", apiChatId);
                window.postMessage(
                    {
                        source: "Tampermonkey",
                        data: "newChat",
                    },
                    "*"
                );
            }
            return response;
        });
    };
	`;

	let script = document.createElement("script");
	script.textContent = scriptContent;
	(document.head || document.documentElement).appendChild(script);
	script.remove();
})();
