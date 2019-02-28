---
published: true
title: Readable NUnit test cases
description: Making NUnit test cases more readable and funny
layout: post
tags: [NUnit, dotnet]
comments: true
---

> A test case is a specification of the inputs, execution conditions, testing procedure, and expected results that define a single test to be executed to achieve a particular software testing objective, such as to exercise a particular program path or to verify compliance with a specific requirement. — [Wikipedia](https://en.wikipedia.org/wiki/Test_case)

Simply speaking, test cases are the way to combine similar tests into one to decrease the number of lines to understand and maintain afterward. So instead of copy-pasting a test you just generalize one via parameters and then express use cases via `TestCase(1, true, "Yep!")` attribute.

How would you test the validation logic below?

```c#
class User
{
    public string FirstName;
    public string LastName;
    public string JobTitle;
    public string AboutYourself;
    public string ResidenceCity;

    public bool IsValid => FirstName != null
                           && LastName != null
                           && JobTitle != null
                           && AboutYourself != null
                           && ResidenceCity != null;
}
```

There will be at least 5 similar unit tests and that is absolutely OK. Can we improve with the help of test cases? Sure thing.

```c#
[TestCase(true, true, true, true, true, true)]
[TestCase(true, false, false, false, false, false)]
[TestCase(false, true, false, false, false, false)]
[TestCase(false, false, true, false, false, false)]
[TestCase(false, false, false, true, false, false)]
[TestCase(false, false, false, false, true, false)]
[TestCase(false, false, false, false, false, false)]
public void User_should_be_valid(
    bool hasFirstName,
    bool hasLastName,
    bool hasJobTitle,
    bool hasAboutYourself,
    bool hasResidenceCity,
    bool isValid
)
{
    // Given
    var user = new User
    {
        FirstName = hasFirstName ? "John" : null,
        LastName = hasLastName ? "Doe" : null,
        JobTitle = hasJobTitle ? ".NET developer" : null,
        AboutYourself = hasAboutYourself ? "Dreamed of being a cowboy but became a developer" : null,
        ResidenceCity = hasResidenceCity ? "Krakow, Poland" : null
    };

    // When
    var actual = user.IsValid;

    // Then
    Assert.That(actual, Is.EqualTo(isValid));
}
```

That's fine but it is not readable at all, probably better to have 5 unit tests still. What else `NUnit` can propose? Maybe this.

```c#
[Test, Sequential]
public void User_should_be_valid(
    [Values(true, true, false, false, false, false, false)] bool hasFirstName,
    [Values(true, false, true, false, false, false, false)] bool hasLastName,
    [Values(true, false, false, true, false, false, false)] bool hasJobTitle,
    [Values(true, false, false, false, true, false, false)] bool hasAboutYourself,
    [Values(true, false, false, false, false, true, false)] bool hasResidenceCity,
    [Values(true, false, false, false, false, false, false)] bool isValid
)
```

A bit better because it looks like a table now. `Values` attribute makes sense here in order to have input values right next to parameter itself. But text formatting confuses on how to read the table. Any improvements? Let's try this.

```c#
const bool x = true;
const bool _ = false;

[Test, Sequential]
public void User_should_be_valid(
    [Values(x, x, _, _, _, _, _)] bool hasFirstName,
    [Values(x, _, x, _, _, _, _)] bool hasLastName,
    [Values(x, _, _, x, _, _, _)] bool hasJobTitle,
    [Values(x, _, _, _, x, _, _)] bool hasAboutYourself,
    [Values(x, _, _, _, _, x, _)] bool hasResidenceCity,
    [Values(x, _, _, _, _, _, _)] bool isValid
)
```

Oh, very cute! Much more readable now. `x` is `true` and `_` is `false` so the chars have the same length and the table is perfectly adjusted. For instance, to adjust numbers you can use [C# 7.0 Digit Separators](https://airbrake.io/blog/csharp/digit-separators-reference-returns-and-binary-literals). Alternatively, you can use spaces and force IDE to ignore reformatting that code via `// @formatter:off|on` [if you use Resharper](https://stackoverflow.com/a/48683309/1400547).

You can consider to fallback to `TestCase` attribute if you really need to rotate/transpose the table.

```c#
const string __ = null;

// @formatter:off
[TestCase("John", "Doe", ".NET developer", "I'm a developer", "Krakow", x)]
[TestCase(__,     "Doe", ".NET developer", "I'm a developer", "Krakow", _)]
[TestCase("John", __,    ".NET developer", "I'm a developer", "Krakow", _)]
[TestCase("John", "Doe", __,               "I'm a developer", "Krakow", _)]
[TestCase("John", "Doe", ".NET developer", __,                "Krakow", _)]
[TestCase("John", "Doe", ".NET developer", "I'm a developer", __,       _)]
[TestCase(__,     __,    __,               __,                __,       _)]
// @formatter:on
public void User_should_be_valid(
    string firstName,
    string lastName,
    string jobTitle,
    string about,
    string city,
    bool isValid)
{
    // Given
    var user = new User
    {
        FirstName = firstName,
        LastName = lastName,
        JobTitle = jobTitle,
        AboutYourself = about,
        ResidenceCity = city
    };

    // When
    var actual = user.IsValid;

    // Then
    Assert.That(actual, Is.EqualTo(isValid));
}
```

And this opens doors for ASCII art :)

```c#
const bool I = true;
const bool o = true;
const bool A = true;
const bool J = false;

[Test, Sequential]
public void User_should_be_valid(
    [Values(x, _, x, x, x, _, _)] bool hasFirstName,
    [Values(x, I, _, _, _, I, _)] bool hasLastName,
    [Values(x, I, o, _, o, I, _)] bool hasJobTitle,
    [Values(x, I, _, A, _, I, _)] bool hasAboutYourself,
    [Values(x, I, _, _, _, I, _)] bool hasResidenceCity,
    [Values(x, _, _, J, _, _, _)] bool isValid
)
```

I'm sure such a funny test make you smile every time you find it - less boring work - more funny development. And it is still green :)

A drawback that it is more complicated to navigate to the failed use case. No free cheese.

The examples are here [Gaev.Blog.Examples.FunnyTestCases](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.6.0/Gaev.Blog.Examples.FunnyTestCases/TestCasesDemo.cs).