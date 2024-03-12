import {Remarkable} from './remarkable.js';

export function render(chat) {
    let markdownConverter = new Remarkable('commonmark');
    let containerEl = document.querySelector(".ba-container");
    let bubbleEl = containerEl.querySelector(".ba-bubble");
    let formEl = containerEl.querySelector(".ba-form");
    let inputEl = formEl.querySelector("input");
    let inputElPlaceholder = inputEl.placeholder;
    let messagesEl = containerEl.querySelector(".ba-chat");
    let recentMessageEl = null;
    bubbleEl.addEventListener("click", () => chat.toggle());
    chat.openingChanged.subscribe(val => setClass(containerEl, "opening", val));
    chat.openedChanged.subscribe(val => {
        setClass(containerEl, "opened", val);
        if (val) inputEl.focus();
    });
    formEl.addEventListener("submit", (evt) => {
        evt.preventDefault();
        chat.userTypedRequest.trigger(inputEl.value);
    });
    chat.respondingChanged.subscribe(val => {
        if (val) {
            inputEl.disabled = true;
            inputEl.placeholder = "...";
            inputEl.value = "";
        } else {
            inputEl.disabled = false;
            inputEl.placeholder = inputElPlaceholder;
            inputEl.focus();
        }
    });
    chat.messageAdded.subscribe(message => {
        messagesEl.innerHTML += "<li></li>";
        recentMessageEl = messagesEl.lastChild;
        updateRecentMessage(message);
    });
    chat.recentMessageUpdated.subscribe(message => updateRecentMessage(message));

    function updateRecentMessage(message) {
        let html = markdownConverter.render(message.content);
        recentMessageEl.innerHTML = `${message.role}: ${html}`;
        recentMessageEl.scrollIntoView(false);
    }

    function setClass(el, className, val) {
        if (val) el.classList.add(className); else el.classList.remove(className);
    }
}

export class BlogAssistant {
    constructor() {
        this.opening = false;
        this.openingChanged = new OnChangedEvent();
        this.opened = false;
        this.openedChanged = new OnChangedEvent();
        this.userTypedRequest = new OnChangedEvent(req => this.onUserTypedRequest(req));
        this.responding = false;
        this.respondingChanged = new OnChangedEvent();
        this.messages = [];
        this.messageAdded = new OnChangedEvent();
        this.recentMessageUpdated = new OnChangedEvent();
        this.threadId = null;
        this.api = new ServiceAgent("https://app.gaevoy.com/blog-assistant/");
    }

    toggle() {
        this.setOpening(!this.opening);
        if (this.opening) {
            if (this.threadId == null)
                this.api.createThread({url: window.location.origin + window.location.pathname}).then(threadId => {
                    this.threadId = threadId;
                })
            // wait for animation
            setTimeout(() => {
                this.setOpened(true);
            }, 300);
        } else {
            this.setOpened(false);
        }
    }

    setOpening(val) {
        this.opening = val;
        this.openingChanged.trigger(val);
    }

    setOpened(val) {
        this.opened = val;
        this.openedChanged.trigger(val);
    }

    setResponding(val) {
        this.responding = val;
        this.respondingChanged.trigger(val);
    }

    async onUserTypedRequest(userRequest) {
        this.setResponding(true);
        let userMessage = new BlogAssistantMessage("User", userRequest);
        this.messages.push(userMessage);
        this.messageAdded.trigger(userMessage);
        let assistantMessage = new BlogAssistantMessage("Assistant", "");
        this.messages.push(assistantMessage);
        this.messageAdded.trigger(assistantMessage);
        await this.api.sendMessageThenReceive(this.threadId, userRequest, respond => {
            assistantMessage.content = respond;
            this.recentMessageUpdated.trigger(assistantMessage);
        });
        this.setResponding(false);
    }
}

export class BlogAssistantMessage {
    constructor(role, content) {
        this.role = role;
        this.content = content;
    }
}

export class ServiceAgent {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || "";
    }

    async createThread(context) {
        let response = await fetch(`${this.baseUrl}api/threads`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(context)
        });
        let result = await response.json();
        console.log("Thread created:", result);
        return result.threadId;
    }

    async sendMessageThenReceive(threadId, message, onReceived) {
        let response = await fetch(`${this.baseUrl}api/threads/${threadId}/messages`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({content: message})
        });
        let reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let responseMessage = "";
        while (true) {
            let {value, done} = await reader.read();
            if (done) break;
            let eventEndIndex;
            while ((eventEndIndex = value.indexOf("\n\n")) >= 0) {
                let event = value.substring(0, eventEndIndex);
                value = value.substring(eventEndIndex + 2);
                const dataPrefix = "data: ";
                if (event.startsWith(dataPrefix)) {
                    let json = event.substring(dataPrefix.length);
                    let data = JSON.parse(json);
                    if (data && data.ContentChunk != null) {
                        responseMessage += data.ContentChunk;
                        onReceived(responseMessage);
                    }
                }
            }
        }
        console.log('Receive completed', responseMessage);
    }
}

class OnChangedEvent {
    constructor(callback) {
        this.callback = callback;
    }

    subscribe(callback) {
        let orig = this.callback;

        this.callback = function () {
            if (orig) orig.apply(this, arguments);
            callback.apply(this, arguments);
        };
    }

    trigger() {
        this.callback.apply(this, arguments);
    }
}
