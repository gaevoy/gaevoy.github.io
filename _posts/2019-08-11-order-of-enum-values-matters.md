---
published: true
title: Respect the order of .NET Enum values or how to rename them correctly
description: Exploring interesting use case when the order of .NET Enum values really makes sense
layout: post
tags: [csharp, dotnet, enum]
comments: true
---

Have you tried to rename `Enum` values if their string representation stored in database or messages? For instance, `Colors` enumeration is

```c#
public enum Colors
{
    Red = 1,
    Green = 2,
    Blue = 3,
    Black = 4
}
```

Hence, I would like to rename `Black` to `White`. ಠ_ಠ No no, it is not what you are thinking about. Say NO to racism, say YES to positive thinking replacing a black with a white. ʘ‿ʘ

Hold on, I cannot simply rename existing `Black` value because deserialization will fail since some messages or database records hold the old value. That is why, I have to add a new value and keep the old one for backward compatibilities, like this.

```c#
public enum Colors
{
    Red = 1,
    Green = 2,
    Blue = 3,
    [Obsolete] Black = White,
    White = 4
}
```

So as a result, the following test should pass, right?

```c#
[Test]
public void It_should_use_a_white_instead_of_a_black()
{
    Assert.AreEqual("White", ((Colors) 4).ToString());
    Assert.AreEqual("White", Enum.Parse<Colors>("Black").ToString());
}
```

Nope! But it must pass, however, it turned out that `.NET` respects the order of `Enum` values. So, to fix the test we need to move `[Obsolete] Black = White` line below the newest value, like this.

```c#
public enum Colors
{
    Red = 1,
    Green = 2,
    Blue = 3,
    White = 4,
    [Obsolete] Black = White
}
```

Of course, so obvious! And the test above is green. It was interesting to figure out this behavior. Don't forget to respect the order of `Enum` values!

Source code is [on Gaev.Blog.Examples.OrderOfEnumValues](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.4.0/Gaev.Blog.Examples.OrderOfEnumValues/OrderOfEnumValuesMatters.cs){:target="_blank"}.
