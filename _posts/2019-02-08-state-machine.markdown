---
published: true
title: Akka-like state machine
description: A simple C# implementation of Akka-like switching behavior via Become() method. When it may be better than using Akka.NET.
layout: post
tags: [FSM, StateMachine, StatePattern, AkkaNet]
comments: true
---

[Akka.NET](https://getakka.net/) actor has really brilliant feature - [switching behavior](https://petabridge.com/blog/akka-actors-finite-state-machines-switchable-behavior/) using `Become()` method. Look, how expressive it is (borrowed [from here](http://dontcodetired.com/blog/post/Switchable-Actor-Behaviour-in-AkkaNET)). How easy to navigate through the code, just `Go to Declaration`, because a state is a method. Love it!

```c#
class LightSwitchBehaviourActor : ReceiveActor
{
    public LightSwitchBehaviourActor()
    {
        TurnedOff();
    }

    private void TurnedOn()
    {
        Receive<FlipTheSwitchMessage>(message =>
        {
            // flip the switch
            Become(TurnedOff);
        });
    }

    private void TurnedOff()
    {
        Receive<FlipTheSwitchMessage>(message =>
        {
            // flip the switch
            Become(TurnedOn);
        });
    }
}
```

However, the state machine can be expressed even easier via [an async function](/2019/01/30/process-manager-as-async-function.html). `Akka` inspired me to write a simple C# implementation for using `Become()` independently of `Akka.NET`. But what's wrong with `Akka` itself?

## Problem

If you need just a state machine, `Akka.Net` has few not obvious difficulties which you need to take into consideration:

### Redundancy and failover is hard

`Akka.NET` is a solid product which is used by software giants like Amazon, Intel, PayPal. It was born to serve incredible load and stay alive.

It is stateful by nature, once an instance of an actor is created it will live in memory until node shutdown. In this case, `Akka` has [Akka.Cluster](https://getakka.net/articles/clustering/cluster-overview.html) that makes sure to run the instance somewhere in order to keep working.

In a stateless app, most probably, you will have the same app runs on multiple nodes under network balancer. So for ASP.NET MVC app, you should not do anything, just keep being stateless.

### Steep learning curve

`Akka.NET` is really cool and has huge potential if you have mastered it. But before that, you will spend a long time learning. This is because of different programming paradigm.

## Solution

I have played a bit and made a simplistic implementation. My experiment is [Gaev.StateMachine](https://github.com/gaevoy/Gaev.StateMachine). The result is so similar to what we have seen above.

```c#
class Delivery
{
    private readonly IStateMachine it = new StateMachine();

    public Delivery()
    {
        it.Become(New);
    }

    public void Handle<TMessage>(TMessage msg) => it.Handle(msg);

    private void New()
    {
        it.Receive<Send>(msg =>
        {
            // sent logic
            it.Become(Sent);
        });
        it.Receive<Cancel>(msg =>
        {
            // cancel logic
            it.Become(Canceled);
        });
        it.ReceiveAny(NotSupported);
    }

    private void Sent()
    {
        it.Receive<Receive>(msg =>
        {
            // receive logic
            it.Become(Received);
        });
        it.ReceiveAny(NotSupported);
    }

    private void Canceled()
    {
        it.ReceiveAny(NotSupported);
    }

    private void Received()
    {
        it.ReceiveAny(NotSupported);
    }

    private object NotSupported(object msg)
    {
        throw new NotSupportedException();
    }

    public class Send { public string Address; }
    public class Receive { public string Feedback; }
    public class Cancel { public string Reason; }
}
```

Let's interact with the delivery state machine.

```c#
void ItCanSendThenReceive()
{
    var delivery = new Delivery();
    delivery.Handle(new Delivery.Send { Address = "Redmond, WA 98052-7329, USA" });
    delivery.Handle(new Delivery.Receive { Feedback = "Wow, thanks!" });
}
void ItCanCancel()
{
    var delivery = new Delivery();
    delivery.Handle(new Delivery.Cancel { Reason = "Running out of money" });
    delivery.Handle(new Delivery.Send { Address = "Redmond, WA 98052-7329, USA" }); // NotSupportedException
}
void ItCanNotCancel()
{
    var delivery = new Delivery();
    delivery.Handle(new Delivery.Send { Address = "Redmond, WA 98052-7329, USA" });
    delivery.Handle(new Delivery.Cancel { Reason = "Running out of money" }); // NotSupportedException
}
```

Mission accomplished :) The experiment has unit tests, [go and play](https://github.com/gaevoy/Gaev.StateMachine/tree/master/Gaev.StateMachine.Tests). Don't forget to give me your feedback ;)