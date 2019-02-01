---
published: true
title: Throttling asynchronous tasks AKA rate limiting
description: The simplest way to throttle async function by SemaphoreSlim in .NET
layout: post
tags: [csharp, dotnet, async, throttling]
comments: true
---

A while ago I wanted to upload al my home photo/video archive to Google Drive. I love bicycles as many developers do so why not to write my own uploader on C# :) [Boom!](https://github.com/gaevoy/Gaev.GoogleDriveUploader)

In the place, I’m currently living (Krakow, Poland) the internet connection is very bad, upload is ~7 Mbps. Once I upload something intensively I can no longer download so kids cannot watch cartoons any longer (╯°□°）╯︵ ┻━┻. That is a really big problem. Kids don’t have their cartoons = I cannot write my code :)

## Problem

For uploading a file I'm using something like this:
```c#
public class Uploader
{
    private readonly DriveService _googleApi;

    public async Task UploadFolder(string path)
    {
        await Task.WhenAll(new DirectoryInfo(path)
            .EnumerateFiles()
            .Select(file => UploadFile(file.FullName))
        );
    }

    public async Task UploadFile(string path)
    {
        using (var content = File.OpenRead(path))
            await _googleApi.UploadFile(path, content);
    }
}
```
It means that if a folder has 100 files the uploader will create 100 concurrent tasks to upload. I have to throttle my uploads so I will be able to download still. For instance, I would like to have at most 2 parallel upload tasks simultaneously.

## Solution

Of course [StackOverflow to the rescue](https://stackoverflow.com/a/22493662/1400547). I was surprised how easy it can be done via `SemaphoreSlim`. Look at that!
```c#
private readonly SemaphoreSlim _throttler = new SemaphoreSlim(/*degreeOfParallelism:*/ 2);

public async Task Throttle()
{
    await _throttler.WaitAsync();
    try
    {
        // calling a method to throttle
    }
    finally
    {
        _throttler.Release();
    }
}
```
 For me, it means no need to use/learn yet another library. The uploader will look like:
 ```c#
 public class ThrottledUploader
 {
     private readonly DriveService _googleApi;
     private readonly SemaphoreSlim _throttler = 
       new SemaphoreSlim( /*degreeOfParallelism:*/ 2);
 
     public async Task UploadFolder(string path)
     {
         await Task.WhenAll(new DirectoryInfo(path)
             .EnumerateFiles()
             .Select(file => UploadFile(file.FullName))
         );
     }
 
     public async Task UploadFile(string path)
     {
         await _throttler.WaitAsync();
         try
         {
             using (var content = File.OpenRead(path))
                 await _googleApi.UploadFile(path, content);
         }
         finally
         {
             _throttler.Release();
         }
     }
 }
 ```

## Syntactic sugar
 
I would like to refactor a bit to remove noise from the implementation above by introducing the following extension method.

```c#
public static class ThrottlerExt
{
    public static async Task<IDisposable> Throttle(this SemaphoreSlim throttler)
    {
        await throttler.WaitAsync();
        return new Throttler(throttler);
    }

    private class Throttler : IDisposable
    {
        private readonly SemaphoreSlim _throttler;

        public Throttler(SemaphoreSlim throttler) => _throttler = throttler;

        public void Dispose() => _throttler.Release();
    }
}
```

As a result `UploadFile` method turns to:
```c#
public async Task UploadFile(string path)
{
    using (_throttler.Throttle())
    using (var content = File.OpenRead(path))
        await _googleApi.UploadFile(path, content);
}
```
Look the one-liner. I love such simplicity! What do you think guys?