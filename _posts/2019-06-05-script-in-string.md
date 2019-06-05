---
published: true
title: "@Html.Raw(json) cross-site scripting trap"
description: Fixing cross-site scripting (XSS)vulnerability in @Html.Raw(json) due to unexpected browser's behavior during parsing JavaScript string.
layout: post
tags: [razor, javascript, XSS, security, dotnet]
comments: true
---

Often, in `ASP.NET` & `JavaScript` apps it is required to pass the server-side model to client-side without `AJAX` requests. For that, the server-side model is converted to `JSON` and puts somewhere in `JavaScript`. You know that. Let's have a quiz. 

What the following `ASP.NET MVC Razor` view will show?

```aspx-cs
@using Newtonsoft.Json
@{
    var serverModel = new[]
    {
        new {Name = "<script>alert(1);</script>"},
        new {Name = "<script>alert(2);</script>"}
    };
    var json = JsonConvert.SerializeObject(serverModel);
}
<html>
<body>

<pre id="content"></pre>
<script>
var clientModel = @Html.Raw(json);
var content = document.getElementById("content");
content.innerText = clientModel.map(e => e.Name).join("\n");
</script>

</body>
</html>
```

Or just pure `HTML`/`JavaScript` page. What about this?

```html
<html>
<body>

<pre id="content"></pre>
<script>
var clientModel = [
    {"Name":"<script>alert(1);</script>"},
    {"Name":"<script>alert(2);</script>"}
];
var content = document.getElementById("content");
content.innerText = clientModel.map(e => e.Name).join("\n");
</script>

</body>
</html>
```

Oops, it gives `2` in the alert window! Hello, cross-site scripting. It is not obvious at all, at least for me. Moreover, I have seen such a pattern of passing the server-side model to client-side quite often. For example: [link #1](https://stackoverflow.com/q/19908649), [link #2](https://stackoverflow.com/a/18831645), [link #3](https://stackoverflow.com/a/24973382).

It turned out that browser's `HTML` parser doesn't care whether `</script>` tag is inside a string or not, most probably it is due to optimization. [Stack Overflow proof](https://stackoverflow.com/a/1659762).

How can we fix such vulnerability? I will give you a few options.

### Use `StringEscapeHandling.EscapeHtml` setting

`Newtonsoft.Json` has a built-in feature to escape `<` `>` characters by passing `StringEscapeHandling.EscapeHtml` as a setting during serialization. [Stack Overflow answer](https://stackoverflow.com/a/48421400).

```c#
var json = JsonConvert.SerializeObject(serverModel, new JsonSerializerSettings
{
	StringEscapeHandling = StringEscapeHandling.EscapeHtml
});
```

### Encode `JSON` via `HttpUtility.JavaScriptStringEncode`

`.NET` has a built-in feature `HttpUtility.JavaScriptStringEncode` to encode `JSON` but it returns a string so `JSON.parse` is required. [Stack Overflow answer](https://stackoverflow.com/a/22768565).

```aspx-cs
var clientModel = JSON.parse("@Html.Raw(HttpUtility.JavaScriptStringEncode(json))");
```

### Serialize via `Json.Encode`

`.NET` has a built-in `Json.Encode` it serializes and encodes at the same time. However, be careful `JavaScriptSerializer` is used instead of `Newtonsoft.Json`, so some [unexpected behavior can take place](https://stackoverflow.com/a/39277843).

Welcome, I reproduced this vulnerability in [Gaev.Blog.Examples.ScriptInString](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.9.0/Gaev.Blog.Examples.ScriptInString/Views/Home). You can also find there proposed fixes.