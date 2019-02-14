---
published: true
title: Self-documented state machine via PlantUML
description: Generating state diagrams for existing state machine with the help of NUnit and PlantUML
layout: post
tags: [PlantUML, UML, StatePattern, NUnit, dotnet]
comments: true
---

A [state diagram](https://en.wikipedia.org/wiki/State_diagram) is a type of diagram used in order to describe the behavior of an entity. For instance, here is the example of an elevator made with the help of `PlantUML`.

![State diagram example](/img/state-diagram-example.svg "State diagram example" ){:style="width:40%" class="block-center"}

The elevator can be in `Stopped` or `Moving` states, where a transition between them is a result of `Next` or `Stop` actions. So for an ancient man, it will be pretty easy to get how the elevator works :)

## Problem

Having great documentation for growing app is a hard task because it quickly becomes outdated and can lead to disinformation. Recently, I showed [how to generate sequence diagrams automatically](/2019/02/04/self-documented-app.html). Now, I would like to set up self-documenting for an entity that makes use of state pattern. How to do that with minimal afford?

## Solution

Let's look into `UserState` example [described here](/2019/02/12/state-pattern-using-entity-framework.html). It is a demonstration of the user login process, you may check [the source code](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.4.2/Gaev.Blog.Examples.StateViaEF/User.cs) to have a clue.

The approach is [the same as before](/2019/02/04/self-documented-app.html) - you don't have to add any dependency to your application source code. All you need is logger and tests, the rest `PlantUML` will do for you. I'm pretty sure you already have those two.

The idea is using logger to write `PlantUML` code. The test runs, as a result, it produces logs, then the logs are captured and converted to state diagram via `PlantUML` automatically.

In the example above, it has [unit tests](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.4.2/Gaev.Blog.Examples.StateViaEF/UserTests.cs) and I'm going to adapt them. 

```c#
[Test]
public void It_should_login()
{
    // Given
    var user = new User();

    // When
    user.State.Login("test");

    // Then
    Assert.That(user.State.HasAccess, Is.True);
    Assert.That(user.State, Is.TypeOf<UserIsAuthorized>());
}
```

Adapted test just captures logs and nothing more.

```c#
private ILogger _logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "{Message}")
    .MinimumLevel.Debug()
    .CreateLogger();
    
[Test]
public void It_should_login()
{
    // Given
    var user = new TestUser(_logger);

    // When
    user.State.Login("test");

    // Then
    Assert.That(user.State.HasAccess, Is.True);
    Assert.That(user.State, Is.TypeOf<UserIsAuthorized>());
}
```

Where `TestUser` is derived from `User` in order to capture the state changes and convert it into `PlantUML` code. Pay attention that I'm checking `_logger.IsEnabled(LogEventLevel.Debug)` it means there will be no performance penalty if this code runs in production.

```c#
public class TestUser : User
{
    private readonly ILogger _logger;

    public TestUser(ILogger logger)
    {
        _logger = logger;
    }

    public override void OnStateChanged(UserState prev, UserState next)
    {
        if (_logger.IsEnabled(LogEventLevel.Debug))
        {
            var callingMethod = new StackTrace().GetFrame(2).GetMethod();
            _logger.Debug($"{prev.GetType().Name} --> {next.GetType().Name} : {callingMethod.Name}");
        }
    }
}
```

The logic of capturing logs is in place. Let's generate the diagram by the logs.

```c#
[Test]
public void PlantUml_should_build_state_diagram()
{
    // Given
    var planUmlCode = new List<string>();
    _logger = Substitute.For<ILogger>();
    _logger.IsEnabled(LogEventLevel.Debug).Returns(true);
    _logger.When(e => e.Debug(Arg.Any<string>())).Do(e => planUmlCode.Add(e.Arg<string>()));

    // When
    It_should_login();
    It_should_show_captcha();
    It_should_validate_captcha();
    It_should_be_blocked();
    It_should_logout();

    // Then
    var veryFirstState = planUmlCode[0].Substring(0, planUmlCode[0].IndexOf(" --> "));
    planUmlCode.Add($"[*] --> {veryFirstState}");
    var code = string.Join("\n", planUmlCode.Distinct());
    var diagramUrl = new RendererFactory()
        .CreateRenderer()
        .RenderAsUri(code, OutputFormat.Png);
    Console.WriteLine(diagramUrl);
}
```

The line `[*] --> {veryFirstState}` forces `PlantUML` to generate state diagram instead of sequence. The rendering itself is done by good friend `PlantUml.Net` package. `PlantUML` cannot generate `ASCII` state diagram correct, well then `PNG` or `SVG` to the rescue. It is nice to have URL of the diagram, so even if the test is run by `Continuous Integration` server, anyone still is able to open the diagram, that is why `RenderAsUri` method is used.

Finally, the result is awesome!

![State diagram built by unit tests](/img/self-documented-fsm.png "State diagram built by unit tests")

See complete example here [Gaev.Blog.Examples.SelfDocumentedFSM](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.4.2/Gaev.Blog.Examples.SelfDocumentedFSM/).