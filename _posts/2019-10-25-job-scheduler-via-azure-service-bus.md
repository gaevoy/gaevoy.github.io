---
published: true
title: Job scheduler via Azure Service Bus
description: Exploring cloud solution for doing job schedule with the help of Azure Service Bus scheduled messages
layout: post
tags: [csharp, cron, messaging, Azure, ServiceBus]
comments: true
---

There are many kinds of jobs that applications can run regularly. For instance:

* renewing subscriptions for paying users on the first of every month
* downloading new data from partner systems every `X` minutes
* sending reminder or close subscriptions for high-debt users
* jobs related to well-known events like opening/closing stock exchange, closing fiscal year, public holidays, black Friday and so on.

What tools can be used? Usually, [cron](https://en.wikipedia.org/wiki/Cron){:target="_blank"}, [Windows Task Scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler){:target="_blank"}, [Quartz.NET](https://github.com/quartznet/quartznet){:target="_blank"} are used or [Task.Delay](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.delay){:target="_blank"} after all.

## Problem

Mostly, job schedulers are doing their job fine unless you run multiple instances of the same application for scalability and/or availability purpose. Just imagine you have 5 instances of the application. `cron`, `Windows Task Scheduler` and `Task.Delay` will fail in such setup. However, `Quartz.NET` will work if database backplane is enabled.

## Solution

I would like to show how a cloud solution can help, specifically [Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus/){:target="_blank"}.

> `Azure Service Bus` is a fully managed enterprise integration message broker. Service Bus is most commonly used to decouple applications and services from each other, and is a reliable and secure platform for asynchronous data and state transfer — [Microsoft](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview){:target="_blank"}

It has a really useful feature - [scheduled messages](https://docs.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing#scheduled-messages){:target="_blank"} at a low price. [$0,05](https://azure.microsoft.com/en-us/pricing/details/service-bus/) per million operations should be enough. `Azure Service Bus` should work well - [Stack Overflow proof](https://stackoverflow.com/a/26915249/1400547){:target="_blank"}. So our jobs will be distributed evenly across multiple instances and if some instance dies the others will get their jobs to run.

To implement the scheduler I will use `C#` and `Microsoft.Azure.ServiceBus` package. However, it is easy to implement in your programming language since `.NET`, `Java`, `Node.js`, `PHP`, `Python`, `Ruby` are supported and `REST API` fills that gap for other languages. 

```c#
public class ServiceBusJobScheduler
{
    private readonly string _connectionString;

    public ServiceBusJobScheduler(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task Run(
        string queueName,
        Func<Message> init,
        Func<Message, Task<Message>> job,
        CancellationToken cancellation
    )
    {
        var queueClient = new QueueClient(_connectionString, queueName);
        var created = await EnsureQueueCreated(queueName);
        if (created)
            await queueClient.SendAsync(init());
        queueClient.RegisterMessageHandler(
            handler: async (message, _) =>
            {
                var nextMessage = await job(message);
                if (nextMessage != null)
                    await queueClient.SendAsync(nextMessage);
            },
            exceptionReceivedHandler: _ => Task.CompletedTask
        );
        await Wait(cancellation);
        await queueClient.CloseAsync();
    }

    ...
}
```

A new queue `queueName` must be created per a job. `init` callback is called the first time only to schedule very first run. `job` function is our job itself, it receives a scheduled message and returns the next scheduled message. In the scheduled message you can store a state for the job between runs. `cancellation` is the way to stop the job. `EnsureQueueCreated` creates `queueName` queue if it is not there. `Wait` just waits until cancellation is requested. The complete source code is [on Gaev.Blog.AzureServiceBusTaskScheduler](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.8.0/Gaev.Blog.AzureServiceBusTaskScheduler){:target="_blank"}.

That's how a job looks like.

```c#
var scheduler = new ServiceBusJobScheduler(ConnectionString);
await scheduler.Run(
    queueName: "TakeABreak",
    init: () => new Message
    {
        ScheduledEnqueueTimeUtc = DateTime.UtcNow
    },
    job: async (message) =>
    {
        var scheduledFor = message.ScheduledEnqueueTimeUtc.ToLocalTime();
        Console.WriteLine($"Take a break! It is {scheduledFor:T}.");
        await Task.Delay(100);
        return new Message
        {
            ScheduledEnqueueTimeUtc = CronExpression
                .Parse("*/30 8-18 * * MON-FRI")
                .GetNextOccurrence(DateTime.UtcNow, TimeZoneInfo.Local)
                .Value
        };
    },
    cancellation.Token
);
```

Let me introduce you `TakeABreak` job. It will remind me to take a break from the computer at [\*/30 8-18 \* \* MON-FRI](https://crontab.guru/#*/30_8-18_*_*_MON-FRI){:target="_blank"}. I'm using cron expression to compute the next date via [Cronos](https://www.nuget.org/packages/Cronos/){:target="_blank"}. That's it and we are done.

![Azure Service Bus queue](/img/service-bus/take-a-break-queue.png "Azure Service Bus queue" ){:style="max-width:1500px; width:100%;" class="block-center"}

Take a look at how tasks are distributed across multiple instances.

![Running multiple instances of the job](/img/service-bus/take-a-break-job.png "Running multiple instances of the job" ){:style="max-width:910px; width:100%;" class="block-center"}

By the way, you can implement [almost the same](https://mrochon.azurewebsites.net/2013/10/12/using-azure-queues-to-schedule-work-items/){:target="_blank"} via [Azure Queues](https://docs.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction){:target="_blank"} but it has a limit for scheduling time. Messages cannot be scheduled more than 7 days ahead.

## Pitfalls

Watch out for exceptions! [By default](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues#exceeding-maxdeliverycount){:target="_blank"}, `Service Bus` retries 10 times then moves the message into the dead-letter queue.

Watch out for long-running tasks! [By default](https://github.com/Azure/azure-docs-sdk-dotnet/issues/754){:target="_blank"}, `Service Bus` waits 5 minutes then returns the message to the queue so others can process is again.

What job scheduler works well for you? Let me and readers know in comments :)
