---
published: false
title: Audit log via transactional outbox
description: ...
layout: post
tags: [csharp, dotnet, event-sourcing, cqrs, NEventStore]
comments: true
---

I'm working for a project with data-centric approach mostly. Well, as it happens historically ;) Frequently, I'm keep asked to figure out `when` and `who` changed a state of entity. In most cases I have no clue because application was not designed to record such things. Finally, the application is going to be refactored to keep an audit log. But there is an issue. How to be sure the audit log is complete? Of course, good testing will filter out the most mistakes. What else? Event sourcing & CQRS is the perfect solution! Right?

> Event sourcing persists the state of a business entity such an Order or a Customer as a sequence of state-changing events. Whenever the state of a business entity changes, a new event is appended to the list of events. Since saving an event is a single operation, it is inherently atomic. The application reconstructs an entity’s current state by replaying the events — [Microservice Architecture](https://microservices.io/patterns/data/event-sourcing.html)

Event sourcing & CQRS is super great tool. I love the fact that all history is recorded, and it is naturally complete. However, for me there are huge pain points such as eventual consistency, projection management, saga/process manager. Sure, you could live with them but at what price? If I need to introduce audit log only, event sourcing may be an overkill, in most cases.

[Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) is a good trade-off. Basically it means, when you change the state of entity, you will insert audit log records together within the same transaction. See below, the `Order` table is where you save the entity, the `Outbox` table is your audit log.

![Transactional outbox diagram](/img/transactional-outbox/ReliablePublication.png "Transactional outbox diagram" ){:style="max-width:910px; width:100%;" class="block-center"}

There will be much less change for existing data-centric applications. Bonus! You can easily replicate audit log further to: a message bus, data visualization tool, log management system. Pretty tasty, huh? Yeah, what's the catch?

Well, `Transactional outbox` approach has a few side effects:
* Of course, database must support transactions.
* Audit log is always late at most for the time of transaction timeout. So `Outbox` is eventually consistent.
* Developer might forget to record the audit log after changing the entity.

I found these implementations that fit for `Transactional outbox`:
* [NEventStore](https://github.com/NEventStore/NEventStore)
* [SQLStreamStore](https://github.com/SQLStreamStore/SQLStreamStore)
* [DotNetCore.CAP](https://github.com/dotnetcore/CAP)
* [Eventuate Tram](https://github.com/eventuate-tram/eventuate-tram-core-dotnet/)

```c#
public interface IChangeLog
{
    IEnumerable<IEvent> GetUncommittedChanges();
    void MarkChangesAsCommitted();
}
public interface IOutbox
{
    void Send(IEnumerable<IChangeLog> changes);
    Task Receive(Action<IEvent> onReceived, CancellationToken cancellation);
}
```
