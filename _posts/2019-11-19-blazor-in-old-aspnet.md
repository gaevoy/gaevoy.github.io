---
published: true
title: Using Blazor WebAssembly in the old ASP.NET
description: One of example how to add Blazor WebAssembly app in existing old ASP.NET MVC solution 
layout: post
tags: [csharp, blazor, webassembly, aspnet]
comments: true
---

The building of a rich user interface is not always easy for `.NET` developers, especially if you dive deep to use `React`, `Angular`, `webpack` and friends. `Blazor` gives a nice trade-off bringing `Razor`-like templates and `C#` to a browser utilizing [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly).

> `Blazor` is a free and open-source web framework that enables developers to create web apps using `C#` and `HTML`. It is being developed by `Microsoft` — [Wikipedia](https://en.wikipedia.org/wiki/Blazor)

## Problem

Currently, I'm working with legacy projects, which cannot be easily ported to `.NET Core` to make use of the newest technologies. However, it is possible to run `Blazor WebAssembly` even in old-fashioned `ASP.NET Web Forms` or `ASP.NET MVC` and I'm going to show how. The following approach has been tested on production so it should work fine for you :)

## Solution

As a starting point, I'm going to create `ASP.NET MVC` project from one of the default templates. [Here is it](https://github.com/gaevoy/Gaev.BlazorOnAspNet/tree/master/OldAspNetApp), our playground is ready and I call it `OldAspNetApp`. For instance, `About.cshtml` page looks like this:

```html
@{
    ViewBag.Title = "About";
}
<h2>@ViewBag.Title.</h2>
<h3>@ViewBag.Message</h3>

<p>Use this area to provide additional information.</p>
```

Let's add `Blazor WebAssembly` app now. The easiest way is to use `blazorwasm` template for `.NET Core` client, [read more](https://docs.microsoft.com/en-us/aspnet/core/blazor/get-started?view=aspnetcore-3.0&tabs=netcore-cli). Additionally, I added [web.config](https://github.com/gaevoy/Gaev.BlazorOnAspNet/blob/blazor-app/BlazorWasmApp/web.config) that fits our needs. Basically, it is almost the same as what `dotnet publish` produces. Our new `Blazor` projects I called `BlazorWasmApp`. As an example, `About.razor` page is:

```html
@page "/Home/About"

<div class="panel panel-primary">
    <div class="panel-heading">
        Blazor WASM app
    </div>
    <div class="panel-body">
        <p>Current count: @currentCount</p>
        <button class="btn btn-primary" @onclick="IncrementCount">Click me</button>
    </div>
</div>

@code {
    int currentCount = 0;

    void IncrementCount()
    {
        currentCount++;
    }
}
```

In order to reference `BlazorWasmApp` to `OldAspNetApp` I added [Post-Build action](https://github.com/gaevoy/Gaev.BlazorOnAspNet/pull/1/files#diff-c35ae0503b58019deae8124bcf0f4557R19-R22) for `BlazorWasmApp.csproj`.

```xml
<Target Name="CopyToOldAspNetApp" AfterTargets="Build">
    <Exec Command="xcopy $(TargetDir)web.config $(TargetDir)dist\_framework\ /Y" />
    <Exec Command="xcopy $(TargetDir)dist $(SolutionDir)OldAspNetApp /Y /S" />
</Target>
```

It just copies all files `BlazorWasmApp` project produces into `OldAspNetApp` folder including `web.config`.

To render `Blazor` page in `OldAspNetApp` I need only this:

```html
<BlazorWasmApp>Blazor WASM app loading...</BlazorWasmApp>
<base href="/"/>
<script src="/_framework/blazor.webassembly.js"></script>
```
 
 In order to reuse easily, I'm going to put these 3 lines into a shared partial view (`BlazorWasmApp.cshtml`). As a result, `About.cshtml` page of `OldAspNetApp` becomes this:
 
 ```html
@{
    ViewBag.Title = "About";
}

@Html.Partial("BlazorWasmApp")

<h2>@ViewBag.Title.</h2>
<h3>@ViewBag.Message</h3>

<p>Use this area to provide additional information.</p>
```

By default, `Blazor` app intercepts all clicks to prevent a full page reload. In my case, it breaks `OldAspNetApp` so I disabled it [here](https://github.com/gaevoy/Gaev.BlazorOnAspNet/pull/1/files#diff-8d952ee206db0390c0972cba01ba6936R12) via overriding default implementation of [INavigationInterception](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.components.routing.inavigationinterception).

Finally, it is done. I have created [the pull request](https://github.com/gaevoy/Gaev.BlazorOnAspNet/pull/1/files) for an easier understanding of what has been changed. Complete source code is in [blazor-app](https://github.com/gaevoy/Gaev.BlazorOnAspNet/tree/blazor-app)  branch of `Gaev.BlazorOnAspNet` project.

## Update as of 2023

`Gaev.BlazorOnAspNet.sln` has been created using `.NET Framework 4.5` which is too old in 2023. So, `Gaev.BlazorOnAspNet_4_8.sln` using `.NET Framework 4.8` is [here](https://github.com/gaevoy/Gaev.BlazorOnAspNet/blob/master/Gaev.BlazorOnAspNet_4_8.sln).

`Blazor 7` is the latest version as of May 2023. I have created pull request to show on how to use `Blazor 7 WebAssembly` in `ASP.NET Framework 4.8` app, check it out [PR](https://github.com/gaevoy/Gaev.BlazorOnAspNet/pull/7/files) and [branch](https://github.com/gaevoy/Gaev.BlazorOnAspNet/tree/blazor-app-7).

As of 2023, **Pitfalls** section is no longer relevant, but I will keep it, just in case.

![Blazor WASM in old ASP.NET app](/img/blazor/blazor-in-old-aspnet.png "Blazor WASM in old ASP.NET app" ){:style="max-width:1324px; width:100%;" class="block-center"}

## Pitfalls

`Gaev.BlazorOnAspNet` solution should be opened by `Visual Studio 2019` version `16.3+`. Before that specific version, you will get a compilation error, like the following. Most probably, `Visual Studio 2017` will show the same error.

```
Error CS0246: The type or namespace name 'App' could not be found (are you missing a using directive or an assembly reference?)
```

Make sure `.Net Core SDK 3.0+` is installed (via `dotnet --info`).

I managed to find a workaround to open the solution by `Visual Studio 2017` but it requires small changes. See [the pull request](https://github.com/gaevoy/Gaev.BlazorOnAspNet/pull/2/files). The source code is in [vs2017-adaptation](https://github.com/gaevoy/Gaev.BlazorOnAspNet/tree/vs2017-adaptation) branch of `Gaev.BlazorOnAspNet` project.
