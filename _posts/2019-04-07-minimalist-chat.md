---
published: true
title: Chat on bare .NET Core and JS via server-sent events
description: Minimalist implementation of a chat using server-sent events on bare .NET Core and VanillaJS
layout: post
tags: [server-sent-events, dotnet-core, javascript, api]
comments: true
---

For a long time, I want to play with [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events){:target="_blank"}. It seems simple and powerful technology to send out updates from a server to a client with minimum latency. 

> Traditionally, a web page has to send a request to the server to receive new data; that is, the page requests data from the server. With server-sent events, it's possible for a server to send new data to a web page at any time, by pushing messages to the web page. These incoming messages can be treated as Events + data inside the web page. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events){:target="_blank"}

In order to learn by doing, I have decided to build a chat app to be as minimum as possible just to try out the coolness of `server-sent events`. The chat will allow anonymous access and won't store any message history.

I have set the limitation for myself - don't use any libraries. So no `jQuery` or `React` on the client side and no `SignalR` on server-side. Well then, [VanillaJS](https://github.com/nefe/You-Dont-Need-jQuery){:target="_blank"} and [HttpResponse](https://docs.microsoft.com/dotnet/api/system.web.httpresponse){:target="_blank"} are all I need.

## Server-sent events on .NET Core

Simply speaking, a client opens a TCP socket and wait for new messages. A server keeps the socket open and pushes the new messages when needed. The client receives the messages without any need in reconnection. The same socket remains open until the end of the listening session.

At the very beginning, I created an `ASP.NET Web API` controller having 2 actions:
* `GET api/rooms/{room-name}` to listen for the messages of a specific room
* `POST api/rooms/{room-name}/messages` to send a new message into the specific room

```c#
[Route("api/rooms")]
public class RoomsController : ControllerBase
{
    // GET api/rooms/5
    [HttpGet("{room}")]
    public async Task ListenToMessages(string room)
    {
    }
    
    // POST api/rooms/5/messages
    [HttpPost("{room}/messages")]
    public async Task SendMessage(string room, [FromBody] string message)
    {
    }
}
```

The implementation of `ListenToMessages` turns out really small. It makes use of `HttpResponse` and nothing more.

```c#
Response.ContentType = "text/event-stream";
using (var member = new StreamWriter(Response.Body))
{
    var members = RoomMembers.GetOrAdd(room, _ => new List<StreamWriter>());
    lock (members)
        members.Add(member);
    try
    {
        await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted);
    }
    catch (TaskCanceledException) {}
    lock (members)
        members.Remove(member);
}
```

Where `RoomMembers` is `static ConcurrentDictionary<string, List<StreamWriter>>` field of the controller to keep the list of all currently connected members per specific room. 

In order to support reverse proxy, the [following lines](https://serverfault.com/a/801629){:target="_blank"} must be added at the very beginning of the method.

```c#
Response.Headers["Cache-Control"] = "no-cache";
Response.Headers["X-Accel-Buffering"] = "no";
```

Server-sent events support a custom type of events. It would be helpful to signal the client that it successfully connected. In order to do that the following lines must be placed before `await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted)`.

```c#
await member.WriteAsync("event: connected\ndata:\n\n");
await member.FlushAsync();
```

`SendMessage` method gets the list of connected members for provided room and forward the message to all of them.

```c#
if (!RoomMembers.TryGetValue(room, out var members))
    return;
members = SafeCopy(members);
async Task Send(StreamWriter member)
{
    await member.WriteAsync("data: " + message + "\n\n");
    await member.FlushAsync();
}
await Task.WhenAll(members.Select(Send));
```

Where `SafeCopy` method copies the list of members to get rid of `Collection was modified; enumeration operation may not execute` error, [see more](https://stackoverflow.com/a/604843/1400547){:target="_blank"}. 

```c#
List<StreamWriter> SafeCopy(List<StreamWriter> members)
{
    lock (members)
        return members.ToList();
}
```

Members of the same room share the same instance of `members` variable. Hence, the variable is read and changed by multiple threads. Because of `List<T>` is not thread-safe we can use `lock`.

The server-side is done, see the source code of [RoomsController](https://github.com/gaevoy/Gaev.Chat/blob/1.1.0/Gaev.Chat/Controllers/RoomsController.cs){:target="_blank"}.

## Server-sent events on JavaScript

[Can I use](https://caniuse.com/#feat=eventsource){:target="_blank"} service says that all modern browsers except `IE` and `Edge` have built-in support for `server-sent events`. Since I gave up on `IE` why not to use [ES6 classes](https://caniuse.com/#feat=es6-class){:target="_blank"} and [Arrow functions](https://caniuse.com/#feat=arrow-functions){:target="_blank"}.

```javascript
class ChatApi {
    listenToMessages(room, onMessageReceived, onConnected) {
        let source = new EventSource('api/rooms/' + room);
        source.addEventListener('connected', () => onConnected());
        source.addEventListener('message', evt => {
            let message = JSON.parse(evt.data);
            onMessageReceived(message);
        });
    }
    sendMessage(room, message) {
        let req = new XMLHttpRequest();
        req.open('POST', 'api/rooms/' + room + '/messages/');
        req.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        req.send(JSON.stringify(JSON.stringify(message)));
    }
}
```

One strange moment I want to highlight is double serialization to JSON. It is because the server does not know anything about the structure of the message and receives the message as a `string` however `application/json` suggests the server deserialize the message from JSON. An alternative option, `application/x-www-form-urlencoded` can be used as [suggested here](https://stackoverflow.com/a/40856890/1400547){:target="_blank"} but I could not make it work.

As you noticed, I'm using the custom event `connected` that has been sent by the server. The same way `disconnected` event can be implemented to signal that someone is leaving the room. Also, `server-sent events` support automatic reconnects and message ID tracking in order to catch up from the place where it stopped, see [more details](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format){:target="_blank"}.

## Summary

That's really impressive that I can build such apps without any dependency. As a result source code is understandable for everyone. I find `server-sent events` useful to stream app state changes to outside via API like here in chat.

![Chat demo](/img/chat-demo.png "Chat demo" ){:style="max-width:762px; width:100%;" class="block-center"}

You can play with the chat online at [app.gaevoy.com/chat](https://app.gaevoy.com/chat/){:target="_blank"}. The source code is in [Gaev.Chat](https://github.com/gaevoy/Gaev.Chat/tree/1.1.0/Gaev.Chat){:target="_blank"}.
