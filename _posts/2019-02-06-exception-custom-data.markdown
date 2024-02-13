---
published: true
title: Adding custom data to an exception for logger
description: The built-in way to add related data to an exception while logging using Serilog or NLog
layout: post
tags: [Serilog, NLog, NUnit, dotnet, exception]
comments: true
---

Looking at an error log, it is not obvious how to reproduce an exception just by inspecting stack trace or error message. Of course, if you are super smart or lucky you can guess or try to catch the bug, however, it is not always possible. Usually, I need more data related to the exception to take into consideration a state of a system. Context, please!

## Problem

It would be nice to see data connected to the moment when the exception occurred, e.g. `UserId`, `PageUrl`, `RefererUrl`, `Browser`, `SuperDuperSpecificEntityId`. How can it be implemented without changing existing exception types? Moreover, not all exception types are under my control.

## Solution

It turns out that the .NET framework has a built-in feature for that from the very beginning. It is [Exception.Data](https://docs.microsoft.com/en-us/dotnet/api/system.exception.data?view=netframework-4.7.2){:target="_blank"} as `IDictionary`.

We can write related data to `Exception.Data` dictionary then read it before logging. The obtained data may be logged along with the exception.

Let's imagine there is super reliable and stable function :)

```c#
void StableTask(string stableTaskId, string semistableTask)
{
    try
    {
        SemistableTask(semistableTask);
    }
    catch (Exception ex)
    {
        ex.Data["stableTaskId"] = stableTaskId;
        throw;
    }
}

void SemistableTask(string semistableTaskId)
{
    try
    {
        UnstableTask();
    }
    catch (Exception ex)
    {
        ex.Data["semistableTaskId"] = semistableTaskId;
        throw new Exception("SemistableTask", ex);
    }
}

void UnstableTask()
{
    throw new Exception("UnstableTask");
}
```

Here is demo how it logs the exception via `Serilog`.

```c#
[Test]
public void Serilog_should_log_exception_data()
{
    // Given
    var logger = new LoggerConfiguration().WriteTo.Console().CreateLogger();
    var entityId = "AAA";
    var correlationId = "BBB";

    // When
    try
    {
        StableTask(entityId, correlationId);
    }
    catch (Exception ex)
    {
        logger.Error(ex, "My test fails {Data}", GetData(ex));
    }

    // Then
    Assert.That(ConsoleOutput, Does.Contain(entityId));
    Assert.That(ConsoleOutput, Does.Contain(correlationId));
}

```

Where [GetData](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.2.0/Gaev.Blog.Examples.ExceptionCustomData/ErrorLoggingTests.cs#L66-L77{:target="_blank"} is boilerplate code to convert `IDictionary` to typed dictionary and it combines `InnerException.Data`. `ConsoleOutput` is console output which I captured [in here](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.2.0/Gaev.Blog.Examples.ExceptionCustomData/ErrorLoggingTests.cs#L79-L85){:target="_blank"}.

The same demo for `NLog`.

```c#
[Test]
public void NLog_should_log_exception_data()
{
    // Given
    var logger = new LogFactory(WriteToConsoleConfig()).GetCurrentClassLogger();
    var entityId = "AAA";
    var correlationId = "BBB";

    // When
    try
    {
        StableTask(entityId, correlationId);
    }
    catch (Exception ex)
    {
        logger.Error(ex, "My test fails {Data}", GetData(ex));
    }

    // Then
    Assert.That(ConsoleOutput, Does.Contain(entityId));
    Assert.That(ConsoleOutput, Does.Contain(correlationId));
}
```

It works like a charm!

![alt text](/img/exception-data-serilog.png "Exception data passed to Serilog")

The complete example is in [Gaev.Blog.Examples.ExceptionCustomData](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.2.0/Gaev.Blog.Examples.ExceptionCustomData/){:target="_blank"}.

## Caveat

Be careful what you are putting to `Exception.Data`. It needs to be [serializable](https://stackoverflow.com/a/7683796/1400547){:target="_blank"}.
