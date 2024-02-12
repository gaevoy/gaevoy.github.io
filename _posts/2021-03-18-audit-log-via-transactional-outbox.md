---
published: true
title: Audit log via transactional outbox
description: Audit log implementation for a data-centric applications via transactional outbox, NEventStore, EntityFramework with code examples and demo todo app
layout: post
tags: [csharp, dotnet, event-sourcing, NEventStore, EntityFramework]
comments: true
---

I'm working on a project with a data-centric approach mostly. Well, as it happens historically ;) Frequently, I'm keep asked to figure out `when` and `who` changed entity state. In most cases, I have no clue because the application was not designed to record such things. Ideally, the application is going to be refactored to keep an audit log. But there is an issue. How to be sure the audit log is complete? Of course, good testing will filter out the most mistakes. What else? Event sourcing & CQRS is the perfect solution! Right?

### Event sourcing

> Event sourcing persists the state of a business entity such an Order or a Customer as a sequence of state-changing events. Whenever the state of a business entity changes, a new event is appended to the list of events. Since saving an event is a single operation, it is inherently atomic. The application reconstructs an entity’s current state by replaying the events — [Microservice Architecture](https://microservices.io/patterns/data/event-sourcing.html){:target="_blank"}

Event sourcing & CQRS is a super great tool. I love the fact that all history is recorded, and it is naturally complete. However, for me, there are huge pain points such as eventual consistency, projection management, saga/process manager. Sure, you could live with them but at what price? If I need to introduce an audit log only, event sourcing may be overkill.

### Transactional outbox

> A service that uses a relational database inserts messages/events into an outbox table as part of the local transaction. A separate Message Relay process publishes the events inserted into database to a message broker — [Microservice Architecture](https://microservices.io/patterns/data/transactional-outbox.html){:target="_blank"}.

`Transactional outbox` is a good trade-off. It means, when you change the entity state, you will insert audit log records together within the same transaction. See below, the `Order` table is where you save the entity, the `Outbox` table is your audit log.

![Transactional outbox diagram](/img/transactional-outbox/ReliablePublication.png "Transactional outbox diagram" ){:style="max-width:910px; width:100%;" class="block-center"}

There will be much fewer changes for existing data-centric applications. Bonus! You can easily replicate the audit log further to a message bus, data visualization tool, log management system. Pretty tasty, huh? Yeah, what's the catch?

Well, the `transactional outbox` approach has a few side effects:
* Of course, a database must support transactions.
* Audit log is always late at most for the time of transaction timeout. So `Outbox` is eventually consistent.
* Developer might forget to record the audit log after changing the entity.

### Implementation

I found these candidates that may fit for `transactional outbox`:
* [NEventStore](https://github.com/NEventStore/NEventStore){:target="_blank"}
* [SQLStreamStore](https://github.com/SQLStreamStore/SQLStreamStore){:target="_blank"}
* [DotNetCore.CAP](https://github.com/dotnetcore/CAP){:target="_blank"}
* [Eventuate Tram](https://github.com/eventuate-tram/eventuate-tram-core-dotnet/){:target="_blank"}

After testing a lot and playing, `NEventStore`, `SQLStreamStore` works well in the role of outbox. Let's see how my `EntityFramework` context looks like below (also here [EventSourcingDoor.EntityFrameworkCore](https://github.com/gaevoy/EventSourcingDoor/tree/1.0.0/EventSourcingDoor.EntityFrameworkCore){:target="_blank"}):

```c#
public class UserDbContext : DbContext
{
    private readonly IOutbox _outbox;
    public DbSet<User> Users { get; set; }

    public UserDbContext(IOutbox outbox)
    {
        _outbox = outbox;
    }

    public override int SaveChanges(bool acceptAllChanges)
    {
        using var transaction = new TransactionScope();
        var changeLogs = ChangeTracker
            .Entries()
            .Select(e => e.Entity)
            .OfType<IHaveChangeLog>()
            .Select(e => e.Changes)
            .ToList();
        var result = base.SaveChanges(acceptAllChanges);
        _outbox.Send(changeLogs);
        transaction.Complete();
        return result;
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChanges, CancellationToken cancellation = default)
    {
        return SaveChanges(acceptAllChanges);
    }
}
```

Below, transactional outbox with `NEventStore` implementation. Important to note, during sending changes you should enrich them with useful information, such as, `when` and `who` made that, maybe even to add user IP address, page URL, etc. See the full version in [EventSourcingDoor.NEventStore](https://github.com/gaevoy/EventSourcingDoor/tree/1.0.0/EventSourcingDoor.NEventStore){:target="_blank"}.

```c#
public partial class NEventStoreOutbox : IOutbox
{
    private readonly IStoreEvents _eventStore;

    public NEventStoreOutbox(IStoreEvents eventStore)
    {
        _eventStore = eventStore;
    }

    public void Send(IEnumerable<IChangeLog> changes)
    {
        foreach (var changeLog in changes)
        {
            using var stream = _eventStore.OpenStream(Guid.NewGuid().ToString());
            foreach (var change in changeLog.GetUncommittedChanges())
                stream.Add(new EventMessage {Body = change});
            stream.CommitChanges(Guid.NewGuid());
            changeLog.MarkChangesAsCommitted();
        }
    }
}
```

`User` entity will look like below. `ChangeLog` is basically a list of changes made recently. More precisely the list of domain events that happened, which can be considered as an audit log as well. `ChangeLog` is part of [EventSourcingDoor](https://github.com/gaevoy/EventSourcingDoor/tree/1.0.0/EventSourcingDoor){:target="_blank"} library.

```c#
public class User : IHaveChangeLog
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public IChangeLog Changes { get; }

    public User()
    {
        Changes = ChangeLog.For<User>()
            .On<UserRegistered>((self, evt) => self.When(evt))
            .On<UserNameChanged>((self, evt) => self.When(evt))
            .New(this);
    }

    public User(Guid id, string name) : this()
    {
        Changes.Apply(new UserRegistered {Id = id, Name = name});
    }

    private void When(UserRegistered evt)
    {
        Id = evt.Id;
        Name = evt.Name;
    }

    public void Rename(string name)
    {
        Changes.Apply(new UserNameChanged {Id = Id, Name = name});
    }

    private void When(UserNameChanged evt)
    {
        Name = evt.Name;
    }
}
```

There is a bit of over-simplified abstraction to connect dots. An entity implements `IHaveChangeLog` so it has `IChangeLog`. Once the entity is being saved `IOutbox` saves ongoing `IChangeLog`. Profit, we have an audit log for the entity!

```c#
public interface IHaveChangeLog
{
    IChangeLog Changes { get; }
}
public interface IChangeLog
{
    IEnumerable<IEvent> GetUncommittedChanges();
    void MarkChangesAsCommitted();
    void Apply(IEvent evt);
}
public interface IOutbox
{
    void Send(IEnumerable<IChangeLog> changes);
    Task Receive(Action<IEvent> onReceived, CancellationToken cancellation);
}
```

In case you need to replicate the audit log, `Receive` is what you need. As I mentioned above, there must be a delay in reception which usually equals to the timeout of a transaction. You will lose messages during reception without sufficient delay because ongoing transactions currently may not be committed yet. The reception via `NEventStore` looks like this:

```c#
public partial class NEventStoreOutbox : IOutbox
{
    public async Task Receive(Action<IEvent> onReceived, CancellationToken cancellation)
    {
        var cancelling = new TaskCompletionSource<object>();
        cancellation.Register(() => cancelling.SetResult(null));
        using var pollingClient = new PollingClient2(_eventStore.Advanced, ReceiveCommit);
        pollingClient.StartFrom();
        await cancelling.Task;

        HandlingResult ReceiveCommit(ICommit commit)
        {
            var visibilityDate = DateTime.UtcNow - TransactionManager.DefaultTimeout;
            if (commit.CommitStamp > visibilityDate)
                return HandlingResult.Retry;
            foreach (var evt in commit.Events)
                onReceived(evt.Body);
            return HandlingResult.MoveToNext;
        }
    }
}
```

### Conclusion

`NEventStore` saves my domain events into `Commits` table, so if I query it the following audit log will pop-up.

```json
[{"Body":{"$type":"UserRegistered","Id":"e726ba7f-3cce-4b17-a6c2-5bbfe67a0367","Name":"User#2","Version":1}}]
[{"Body":{"$type":"UserRegistered","Id":"7d83dca3-c8f1-45b0-9fa2-1389043906de","Name":"User#1","Version":1}}]
[{"Body":{"$type":"UserNameChanged","Id":"e2b06a4f-1a6b-461f-a6b6-58b7faa117e5","Name":"James Bond","Version":2}}]
[{"Body":{"$type":"UserRegistered","Id":"e2b06a4f-1a6b-461f-a6b6-58b7faa117e5","Name":"Bond","Version":1}}]
[{"Body":{"$type":"UserNameChanged","Id":"bbdee927-3a60-4640-8881-f29190c7291a","Name":"James Bond #2","Version":2}}]
[{"Body":{"$type":"UserRegistered","Id":"bbdee927-3a60-4640-8881-f29190c7291a","Name":"Bond","Version":1}}]
[{"Body":{"$type":"UserRegistered","Id":"ca12cac5-f130-4f6d-9981-3cb7bfca6b90","Name":"Bond","Version":1}}]
[{"Body":{"$type":"UserRegistered","Id":"64a88d05-555f-4d1d-bc50-0b71b2b59f68","Name":"User#2","Version":1}}]
[{"Body":{"$type":"UserRegistered","Id":"5fc0a9de-9223-44a7-8200-4d2b8d59d1cf","Name":"User#1","Version":1}}]
[{"Body":{"$type":"UserRegistered","Id":"228da58a-66ee-4c57-9af6-c17b8f02e05e","Name":"Bond","Version":1}}]
```

The outbox using `NEventStore` and `SQLStreamStore` show a good performance. An entity with outbox saves in 2ms vs 0.5ms without it (tested on `MsSql` + `NEventStore`). They both work well on `MsSql` and `Postgres` databases, on Windows and Linux. Moreover, concurrency is still great so long transactions won't affect the rest. However, when `EntityFramework` saves multiple entities at once within the same database context, the order in which changes appear in the outbox is unpredictable. Of course, for the audit log, it is not a big deal. Well, to workaround, save the entities one-by-one.

The name `EventSourcingDoor` is for a reason. Once, your entity implements `IHaveChangeLog` meaning it publishes audit log AKA domain events, the door is open to switch to pure event sourcing. So before moving your existing application to event sourcing consider [EventSourcingDoor](https://github.com/gaevoy/EventSourcingDoor/){:target="_blank"} :)

[See the pull request](https://github.com/gaevoy/EventSourcingDoor/pull/1){:target="_blank"} how I refactored the [todo app](https://github.com/gaevoy/EventSourcingDoor/tree/1.0.0/EventSourcingDoor.Examples.TodoApp){:target="_blank"} and introduced an audit log via transactional outbox there.

Let me know down below in the comments what do you think.
