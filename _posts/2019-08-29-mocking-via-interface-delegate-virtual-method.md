---
published: true
title: Mocking via interface vs delegate vs virtual method in C#
description: "Let's consider 3 options on how to mock a single method: interface, delegate, virtual method"
layout: post
tags: [csharp, NUnit, NSubstitute, mocking, dotnet]
comments: true
---

Quite often, I face a dilemma on how to mock a single method. It looks like overengineering for nothing, when the method is being moved outside of the class, just to mock it afterward. But what alternatives do we have? 

Before answering the question let's consider a specific code example. We have a model `Customer` and business logic implemented in `ICustomerService` and `CustomerService`.

```c#
public class Customer
{
    public Customer(Guid id, DateTime createdAt, string name)
    {
        Id = id;
        CreatedAt = createdAt;
        Name = name;
    }

    public Guid Id { get; }
    public DateTime CreatedAt { get; }
    public string Name { get; }
}

public interface ICustomerService
{
    Customer RegisterCustomer(string name);
}

public class CustomerService : ICustomerService
{
    public Customer RegisterCustomer(string name)
    {
        return new Customer(NewId(), GetUtcNow(), name);
    }

    private Guid NewId() => Guid.NewGuid();
    private DateTime GetUtcNow() => DateTime.UtcNow;
}
```

As you can see `CustomerService` uses `Guid.NewGuid()` and `DateTime.UtcNow`. Hence, it is super hard to test `RegisterCustomer` method, because I cannot predict value returned by `Guid.NewGuid()`, moreover I can know the value of `DateTime.UtcNow` only approximately. So without mocking these two, I cannot do much. 

I want to show you 3 possible options on how to refactor this source code for better unit-testing. I'm not going to choose a better option, it is always a trade-off.

## Mocking via `interface`

Of course, a well-known approach is to move the required method into yet another interface and inject its instance into a constructor.

```c#
public interface IIdGenerator
{
    Guid NewId();
}

public class IdGenerator : IIdGenerator
{
    public Guid NewId() => Guid.NewGuid();
}

public interface ISystemTime
{
    DateTime GetUtcNow();
}

public class SystemTime : ISystemTime
{
    public DateTime GetUtcNow() => DateTime.UtcNow;
}

public class CustomerService : ICustomerService
{
    private readonly IIdGenerator _idGenerator;
    private readonly ISystemTime _systemTime;

    public CustomerService(IIdGenerator idGenerator, ISystemTime systemTime)
    {
        _idGenerator = idGenerator;
        _systemTime = systemTime;
    }

    public Customer RegisterCustomer(string name)
    {
        return new Customer(_idGenerator.NewId(), _systemTime.GetUtcNow(), name);
    }
}
```

The unit test via mocking of interfaces is done. I'm using [NSubstitute](https://nsubstitute.github.io/) here to mock.

```c#
[Test]
public void CustomerService_should_register_customer()
{
    // Given
    var id = Guid.NewGuid();
    var now = DateTime.UtcNow;
    var name = Guid.NewGuid().ToString();
    var idGenerator = Substitute.For<IIdGenerator>();
    idGenerator.NewId().Returns(id);
    var systemTime = Substitute.For<ISystemTime>();
    systemTime.GetUtcNow().Returns(now);
    var service = new CustomerService(idGenerator, systemTime);

    // When
    var customer = service.RegisterCustomer(name);

    // Then
    Assert.That(customer.Id, Is.EqualTo(id));
    Assert.That(customer.CreatedAt, Is.EqualTo(now));
    Assert.That(customer.Name, Is.EqualTo(name));
}
```

## Mocking via `delegate`

For a single method, why not to pass it as a delegate like it usually done in functional programming languages. Moreover having a default implementation right in this class will simplify things. More theory is [here](https://softwareengineering.stackexchange.com/a/345490) and [here](https://stackoverflow.com/a/28644831/1400547).  

```c#
public class CustomerService : ICustomerService
{
    public Func<Guid> NewId = () => Guid.NewGuid();
    public Func<DateTime> GetUtcNow = () => DateTime.UtcNow;

    public CustomerService(Func<Guid> newId = null, Func<DateTime> getUtcNow = null)
    {
        NewId = newId ?? NewId;
        GetUtcNow = getUtcNow ?? GetUtcNow;
    }

    public Customer RegisterCustomer(string name)
    {
        return new Customer(NewId(), GetUtcNow(), name);
    }
}
```

The unit test via mocking of a delegate is ready. No need to use a mocking framework.

```c#
[Test]
public void CustomerService_should_register_customer()
{
    // Given
    var id = Guid.NewGuid();
    var now = DateTime.UtcNow;
    var name = Guid.NewGuid().ToString();
    var service = new CustomerService(newId: () => id, getUtcNow: () => now);

    // When
    var customer = service.RegisterCustomer(name);

    // Then
    Assert.That(customer.Id, Is.EqualTo(id));
    Assert.That(customer.CreatedAt, Is.EqualTo(now));
    Assert.That(customer.Name, Is.EqualTo(name));
}
```

As a bonus feature, a `delegate` [is faster](https://stackoverflow.com/a/2082895/1400547) than `interface` but in most cases, it does not matter.

## Mocking via `virtual` method

Let's recall the original `CustomerService` for a moment. If we convert `NewId`, `GetUtcNow` into `virtual` methods it will give us a chance to mock.

```c#
public class CustomerService : ICustomerService
{
    public Customer RegisterCustomer(string name)
    {
        return new Customer(NewId(), GetUtcNow(), name);
    }

    public virtual Guid NewId() => Guid.NewGuid();
    public virtual DateTime GetUtcNow() => DateTime.UtcNow;
}
```

The unit test via mocking of `virtual` methods is below. [NSubstitute](https://nsubstitute.github.io/) will cope with this as well.

```c#
[Test]
public void CustomerService_should_register_customer()
{
    // Given
    var id = Guid.NewGuid();
    var now = DateTime.UtcNow;
    var name = Guid.NewGuid().ToString();
    var service = Substitute.ForPartsOf<CustomerService>();
    service.When(e => e.NewId()).DoNotCallBase();
    service.When(e => e.GetUtcNow()).DoNotCallBase();
    service.NewId().Returns(id);
    service.GetUtcNow().Returns(now);

    // When
    var customer = service.RegisterCustomer(name);

    // Then
    Assert.That(customer.Id, Is.EqualTo(id));
    Assert.That(customer.CreatedAt, Is.EqualTo(now));
    Assert.That(customer.Name, Is.EqualTo(name));
}
```

If `public virtual` somehow violates encapsulation for you, it can be replaced with `internal virtual` (or `protected internal virtual`) in conjunction with [InternalsVisibleToAttribute](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.internalsvisibletoattribute).

As an experiment lately, I started to mock via `delegate` and `virtual` method and I love it since source code changes are as small as it can be. Of course, I keep mocking via `interface` when it makes sense. Feel free to let me know how do you mock?

See complete source code in [Gaev.Blog.Examples.Mocking](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.5.1/Gaev.Blog.Examples.Mocking).