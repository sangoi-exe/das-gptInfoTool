# das-gptInfoTool
## GPT4 Token and Message Counter
### Overview

This is a Chrome browser extension designed to enhance the user experience on the OpenAI GPT-4 Web interface. It helps users keep track of the number of messages sent to the GPT-4 model, the number of tokens used, and the start time of the 3-hour usage cap.

The extension works by using a Tampermonkey script to override the fetch function, capturing the fetch request and response. The collected information is stored in the localStorage and is then accessed and processed by the Chrome extension.

## Features

1. **Message Counter**: Keeps track of the number of messages sent to GPT-4 during a session.
2. **Token Counter**: Monitors the number of tokens used in a session.
3. **Cap Timer**: Records the start time of the 3-hour cap for GPT-4 usage.

## Installation Instructions

### Prerequisites

- Google Chrome Browser
- Tampermonkey Extension installed on Chrome

### Steps

1. Download or clone this repository.
2. Install the Tampermonkey extension on your Chrome browser if you haven't already.
3. Open Tampermonkey dashboard and create a new script.
4. Copy and paste the content of `backend.js` into the new script and save it.
5. Open the Extension Management page by navigating to `chrome://extensions`. The Extension Management page can also be opened by clicking on the menu icon, hovering over More Tools then selecting Extensions.
6. Enable Developer Mode by clicking the toggle switch next to Developer mode.
7. Click the LOAD UNPACKED button and select the downloaded or cloned directory.

## Usage Instructions

Once the extension is installed, navigate to the OpenAI GPT-4 Web interface. The Tampermonkey script will automatically start tracking the fetch requests and responses, storing the data in localStorage. The Chrome extension will then access this data and display the number of messages, tokens, and the start time of the 3-hour cap.

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
