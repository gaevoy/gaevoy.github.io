---
published: true
title: The state pattern using Entity Framework
description: Implementing the state pattern using Entity Framework as simple as possible without touching mapping
layout: post
tags: [StatePattern, EntityFramework, NUnit, dotnet]
comments: true
---

Have you heard about `if-then` driven logic? Or maybe something about `switch` driven logic? Aha, you have even seen it. Me too. Moreover, I keep seeing such logic quite often. Despite the fact that state pattern is known for decades from the Gang of Four, developers simply ignore it.

Let's imagine typical class with `if-then` logic. Here is an example of login workflow.

```c#
public class User
{
    public int NumberOfAttempts { get; set; }
    public string Captcha { get; set; }
    public DateTimeOffset? BlockedUntil { get; set; }
    public UserState State { get; set; }

    public void Login(string password)
    {
        if (State != AttemptsToLogin) throw new InvalidOperationException();
        if (password == "test")
            State = IsAuthorized;
        else
        {
            NumberOfAttempts++;
            if (NumberOfAttempts > 2)
            {
                Captcha = Guid.NewGuid().ToString();
                State = InputsCaptcha;
            }
        }
    }

    public void InputCaptcha(string captcha)
    {
        if (State != InputsCaptcha) throw new InvalidOperationException();
        if (captcha == Captcha)
        {
            NumberOfAttempts = 0;
            State = AttemptsToLogin;
        }
        else
        {
            BlockedUntil = DateTimeOffset.UtcNow.AddHours(1);
            State = IsBlocked;
        }
    }

    public void Logout()
    {
        if (State != IsAuthorized) throw new InvalidOperationException();
        NumberOfAttempts = 0;
        State = AttemptsToLogin;
    }

    public enum UserState
    {
        AttemptsToLogin,
        IsAuthorized,
        InputsCaptcha,
        IsBlocked
    }
}
```  

## Problem

What's wrong with `if-then` logic demonstrated above? I would say nothing while there are a few lines of code. Once the code gets bigger the logic is no longer looks OK. For instance, since the size of the class gets larger it would be nice to split.

Is there any easy way to apply the state pattern to the example above? I don't want to break existing working logic by introducing huge change, which can take place by changing `Entity Framework` mapping.

## Solution

Playing around, I have found as simple as a possible solution to refactor to the state pattern. You don't even need to change `Entity Framework` mapping since state data are still persisted in its entity. Yep, it is a trade-off in favor of simplicity, why not?

```c#
public class User
{
    private UserState _userState;

    [NotMapped]
    public UserState State
    {
        get => _userState ?? (_userState = UserState.New(StateType, this));
        set => _userState = value;
    }

    public int Id { get; set; }
    public string StateType { get; set; }
    public int NumberOfAttempts { get; set; }
    public string Captcha { get; set; }
    public DateTimeOffset? BlockedUntil { get; set; }
}

public class UserAttemptsToLogin : UserState
{
    protected override void OnStart()
    {
        User.NumberOfAttempts = 0;
        User.Captcha = null;
    }

    public override void Login(string password)
    {
        if (password == "test")
            Become(new UserIsAuthorized());
        else
        {
            User.NumberOfAttempts++;
            if (User.NumberOfAttempts > 2)
                Become(new UserInputsCaptcha());
        }
    }
}

public class UserIsAuthorized : UserState
{
    public override bool HasAccess => true;

    public override void Logout()
    {
        Become(new UserAttemptsToLogin());
    }
}

public class UserInputsCaptcha : UserState
{
    protected override void OnStart()
    {
        User.Captcha = Guid.NewGuid().ToString();
    }

    public override void InputCaptcha(string captcha)
    {
        if (captcha == User.Captcha)
            Become(new UserAttemptsToLogin());
        else
            Become(new UserIsBlocked());
    }
}

public class UserIsBlocked : UserState
{
    protected override void OnStart()
    {
        User.BlockedUntil = DateTimeOffset.UtcNow.AddHours(1);
    }
}
```

Where `UserState` class is default state logic to derive from.

```c#
public abstract class UserState
{
    protected User User { get; private set; }
    public virtual void Login(string password) => throw new InvalidOperationException();
    public virtual void InputCaptcha(string captcha) => throw new InvalidOperationException();
    public virtual void Logout() => throw new InvalidOperationException();
    public virtual bool HasAccess => false;

    protected virtual void OnStart()
    {
    }

    protected void Become(UserState next)
    {
        next.User = User;
        next.OnStart();
        User.StateType = next.GetType().Name;
        User.State = next;
    }

    public static UserState New(string type, User user)
    {
        switch (type)
        {
            case nameof(UserIsAuthorized): return new UserIsAuthorized {User = user};
            case nameof(UserInputsCaptcha): return new UserInputsCaptcha {User = user};
            case nameof(UserIsBlocked): return new UserIsBlocked {User = user};
            default: return new UserAttemptsToLogin {User = user};
        }
    }
}

```

Unit tests may use [HavingState](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.3.2/Gaev.Blog.Examples.StateViaEF/UserTests.cs#L185-L189){:target="_blank"} extension method to turn the state into a required type.

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

[Test]
public void It_should_show_captcha()
{
    // Given
    var user = new User {NumberOfAttempts = 2}.HavingState<UserAttemptsToLogin>();

    // When
    user.State.Login("fail");

    // Then
    Assert.That(user.State.HasAccess, Is.False);
    Assert.That(user.Captcha, Is.Not.Null);
    Assert.That(user.State, Is.TypeOf<UserInputsCaptcha>());
}

[Test]
public void It_should_validate_captcha()
{
    // Given
    var captcha = Guid.NewGuid().ToString();
    var user = new User {Captcha = captcha}.HavingState<UserInputsCaptcha>();

    // When
    user.State.InputCaptcha(captcha);

    // Then
    Assert.That(user.Captcha, Is.Null);
    Assert.That(user.State, Is.TypeOf<UserAttemptsToLogin>());
}

[Test]
public void It_should_throw_error_in_UserAttemptsToLogin_state()
{
    // Given
    var user = new User().HavingState<UserAttemptsToLogin>();

    // When
    void InputCaptcha() => user.State.InputCaptcha("");
    void Logout() => user.State.Logout();

    // Then
    Assert.That(InputCaptcha, Throws.Exception.TypeOf<InvalidOperationException>());
    Assert.That(Logout, Throws.Exception.TypeOf<InvalidOperationException>());
}
```

In general, it became more expressive and easier to navigate through the code, just `Go to Declaration`. The similar approach described in the [Akka-like state machine](/2019/02/08/state-machine.html).

I believe this solution is super small and simple so the change from `if-then` to state pattern should not be a problem.
 
The complete example is in [Gaev.Blog.Examples.StateViaEF](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.3.2/Gaev.Blog.Examples.StateViaEF){:target="_blank"}.
