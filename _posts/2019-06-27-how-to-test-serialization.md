---
published: true
title: How to test serialization and deserialization
description: Do we need to test serialization/deserialization? Why? How?
layout: post
tags: [csharp, NUnit, AutoFixture, FluentAssertions]
comments: true
---

`Newtonsoft.Json` is [the most popular package](https://www.nuget.org/stats/packages) in 2019 yet. Because of a need to send data across different applications: browser client app or mobile app, `.NET` app or `Node.JS` server-side app, etc. They all must communicate with each other so there is only one way to go is serialization/deserialization. Since serialization is a mission-critical part of the app it must be proper unit tested. But why do we need to test a well-tested library such as `Newtonsoft.Json`?

I came across a serialization problem some time ago. Let's see a message which I need to pass across apps:

```c#
public class UserRegistered
{
    public UserRegistered(Guid id, string email, string name)
    {
        Id = id;
        Email = email;
        Name = name;
    }

    public Guid Id { get; }
    public string Email { get; }
    public string Name { get; }
}
```

Properties of the messages don't have setters so deserialization logic will use a constructor in order to set values for the properties according to the name. So the name of argument should match the name of a property, otherwise, deserialization will be partial and only matched properties will be set. Exactly this I want to show next.

Let's imagine I'm renaming `Email` property to `Login` like this:

```c#
public class UserRegistered
{
    public UserRegistered(Guid id, string email, string name)
    {
        Id = id;
        Login = email;
        Name = name;
    }

    public Guid Id { get; }
    public string Login { get; }
    public string Name { get; }
}
```

Do you see a mistake? Exactly, the argument name is still `email` so deserialization will succeed but the value of `Login` property will be `null`. Of course, refactoring tools, such as `JetBrains ReSharper`, will rename the argument as well. And still, I would like to cover this use case by unit test to be 100% protected from stupid mistakes which can cost a lot.

First that I wrote is naive version of such unit test.

```c#
[Test]
public void It_should_serialize_then_deserialize_UserRegistered()
{
    // Given
    var random = TestContext.CurrentContext.Random;
    var givenMessage = new UserRegistered(
        id: random.NextGuid(),
        email: random.GetString(),
        name: random.GetString());

    // When
    var json = JsonConvert.SerializeObject(givenMessage);
    var deserializedMessage = JsonConvert.DeserializeObject<UserRegistered>(json);

    // Then
    Assert.That(deserializedMessage.Id, Is.EqualTo(givenMessage.Id));
    Assert.That(deserializedMessage.Email, Is.EqualTo(givenMessage.Email));
    Assert.That(deserializedMessage.Name, Is.EqualTo(givenMessage.Name));
}
```

However, it has potential problems for a growing project which is changed quite often: 
1. Once a new property is added to the message the test must be supplemented.
2. If a property is removed the test must be fixed.
3. When a new message type is introduced developer must write one more unit test.

In order to fix the 1st and 2nd problem, I can generate the message containing random data via [AutoFixture](https://www.nuget.org/packages/AutoFixture). For checking that deserialized message contains the same value as the serialized one I can use [FluentAssertions](https://www.nuget.org/packages/FluentAssertions).

```c#
[Test]
public void It_should_serialize_then_deserialize_UserRegistered_entirely()
{
    // Given
    var givenMessage = new Fixture().Create<UserRegistered>();

    // When
    var json = JsonConvert.SerializeObject(givenMessage);
    var deserializedMessage = JsonConvert.DeserializeObject<UserRegistered>(json);

    // Then
    deserializedMessage.Should().BeEquivalentTo(givenMessage);
}
```

In order to fix the 3rd problem `NUnit` has super cool `TestCaseSource`. It can create dynamically as many tests as there are message types.

```c#
[TestCaseSource(nameof(AllMessageTypes))]
public void It_should_serialize_then_deserialize(Type messageType)
{
    // Given
    var givenMessage = new SpecimenContext(new Fixture()).Resolve(messageType);

    // When
    var json = JsonConvert.SerializeObject(givenMessage);
    var deserializedMessage = JsonConvert.DeserializeObject(json, messageType);

    // Then
    deserializedMessage.Should().BeEquivalentTo(givenMessage);
}

private static IEnumerable<Type> AllMessageTypes =>
    AppDomain.CurrentDomain.GetAssemblies()
        .SelectMany(a => a.GetTypes())
        .Where(t => t.IsClass && t.Namespace == "Gaev.Blog.Examples.Messages");
```

I had to slightly change on how to generate a message with random data from a generic version to [non-generic one](https://github.com/AutoFixture/AutoFixture/issues/97#issuecomment-17064685). As you can see in my example all messages live in `Gaev.Blog.Examples.Messages` namespace. By the way, all demonstrated examples you will find in [Gaev.Blog.Examples.SerializationTests](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.2.0/Gaev.Blog.Examples.SerializationTests).

Have a nice unit-testing ;)