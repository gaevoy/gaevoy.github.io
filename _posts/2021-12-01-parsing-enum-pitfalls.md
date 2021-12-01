---
published: true
title: Pitfalls of parsing .NET enumeration. Is Enum.Parse broken?
description: Let's reveal the not obvious behavior of Enum.Parse, then show how it can backfire, and check whether System.Text.Json has the same pitfalls
layout: post
tags: [csharp, dotnet, enum]
comments: true
---

Nope, `Enum.Parse` [is not broken](https://github.com/dotnet/runtime/issues/20576), it is a feature, not a bug :) However, you have to know its pitfalls. Before deep dive let's warm up a bit. What is enumeration?

> Enumerated type is a data type consisting of a set of named values. The enumerator names are usually identifiers that behave as constants in the language. — [Wikipedia](https://en.wikipedia.org/wiki/Enumerated_type)
> 

Here is, my super-duper simplest enumeration example.

```c#
public enum CountryCode
{
    Undefined = default,
    DK = 10,
    PL = 20
}
```

This one is an over-simplified enumeration of country codes. It consists of `Undefined` which is the default value and a few countries: Poland and Denmark.

## Problem

Let's consider a specific task. I want to determine the country code based on the company's VAT number. Let's imagine there are given numbers: `DK:1034567`, `PL:1034567`, `1034567`. If not possible to determine the country code it should be `Undefined`. It seems like the easiest task for `Enum.Parse`. What can go wrong?

Obvious implementation with the help of `Enum.TryParse` and a couple of tests to check.

```c#
public static CountryCode Parse(string twoLetterCode)
{
    if (Enum.TryParse(twoLetterCode, out CountryCode countryCode))
        return countryCode;

    return CountryCode.Undefined;
}
```

Let's make sure it works as expected. Here `vatNumber[..2]` is [equivalent](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-8.0/ranges) to `vatNumber.Substring(0, 2)`.

```c#
[TestCase("DK:1034567", CountryCode.DK)]
[TestCase("PL:1034567", CountryCode.PL)]
[TestCase("1034567", CountryCode.Undefined)]
public void It_should_parse(string vatNumber, CountryCode expected)
{
    // Given
    string twoLetterCode = vatNumber[..2];

    // When
    CountryCode actual = Parse(twoLetterCode);

    // Then
    Assert.That(actual, Is.EqualTo(expected));
}
```

And one more check to make sure a number without country code prefix gives `Undefined`. The test will repeat `100` times until failure, to check as many random numbers as possible.

```c#
[Test, Repeat(100)]
public void It_should_parse_as_undefined()
{
    // Given
    var randomizer = TestContext.CurrentContext.Random;
    string randomVatNumber = randomizer.Next(1000000, 9999999).ToString();
    string twoLetterCode = randomVatNumber[..2];

    // When
    CountryCode countryCode = Parse(twoLetterCode);

    // Then
    Assert.That(countryCode, Is.EqualTo(CountryCode.Undefined));
}
```

Well, the tests fail. They do not return the default value correctly.

```
Failed It_should_parse("1034567",Undefined) [30 ms]
Error Message:
   Expected: Undefined
But was:  DK

Failed It_should_parse_as_undefined [1 ms]
Error Message:
   Expected: Undefined
But was:  18
```

Quick googling landed me on the nice article [Beware of Enum.TryParse](https://josef.codes/beware-of-enum-try-parse/) and many `StackOverflow` threads ([one](https://stackoverflow.com/q/6741649), [two](https://stackoverflow.com/questions/25301056/enum-tryparse-strange-behaviour)). So I applied the fix introducing `Enum.IsDefined` extra-check.

```c#
public static CountryCode Parse(string twoLetterCode)
{
    if (Enum.TryParse(twoLetterCode, out CountryCode countryCode))
        if (Enum.IsDefined(countryCode))
            return countryCode;

    return CountryCode.Undefined;
}
```

But it didn't help, the tests still fail, however, `It_should_parse_as_undefined` gets another error.

```
Failed It_should_parse("1034567",Undefined) [27 ms]
Error Message:
   Expected: Undefined
But was:  DK

Failed It_should_parse_as_undefined [1 ms]
Error Message:
   Expected: Undefined
But was:  PL
```

The reason for the issue, `Enum.TryParse` tries to match both values AND names. So, both `Enum.Parse<CountryCode>("10")` and `Enum.Parse<CountryCode>("DK")` will give `DK`. As a result, if the random VAT number starts with `10` or `20` the test fails. If you need to parse by names only, there is no way to do that.

### Pitfalls

Let's recap what you must remember about `Enum`:

1. It parses any numeric values even they are not part of the `Enum`, see [dotnetfiddle](https://dotnetfiddle.net/CFiuTa).
```c#
Enum.Parse<CountryCode>("007") // returns 7
Enum.IsDefined(Enum.Parse<CountryCode>("007")) // returns false
```
2. It parses both values and names of the `Enum`, see [dotnetfiddle](https://dotnetfiddle.net/5lHvUh). There is no way to control this.
```c#
Enum.Parse<CountryCode>("DK") // returns DK
Enum.Parse<CountryCode>("10") // returns DK
Enum.IsDefined(Enum.Parse<CountryCode>("DK")) // returns true
Enum.IsDefined(Enum.Parse<CountryCode>("10")) // returns true
```

### Pitfalls apply to `System.Text.Json`

If I implement `Parse` using `System.Text.Json` and run the tests, it will behave like the very first version of `Parse`. Meaning, `JsonSerializer.Deserialize` inherits those 2 pitfalls as well. Be careful!

```c#
public static CountryCode Parse(string twoLetterCode)
{
    var options = new JsonSerializerOptions
    {
        Converters = { new JsonStringEnumConverter() }
    };
    var json = JsonSerializer.Serialize(twoLetterCode);
    return JsonSerializer.Deserialize<CountryCode>(json, options);
}
```

## Solution

Because of the lack of a built-in way to parse by names only, let's make it.

```c#
public static CountryCode Parse(string twoLetterCode)
{
    return Enum
        .GetValues<CountryCode>()
        .FirstOrDefault(val => Enum.GetName(val) == twoLetterCode);
}
```

Or this version which is more memory efficient.

```c#
public static CountryCode Parse(string twoLetterCode)
{
    var valueByName = EnumCache<CountryCode>.ValueByName;
    if (valueByName.TryGetValue(twoLetterCode, out var countryCode))
        return countryCode;

    return CountryCode.Undefined;
}

public class EnumCache<TEnum> where TEnum : struct, Enum
{
    public static readonly Dictionary<string, TEnum> ValueByName
        = Enum.GetValues<TEnum>().ToDictionary(Enum.GetName);
}
```

Tests are green, we are done. I could not find an easy way how to change the behavior for `System.Text.Json`.

By the way, you could scream: `Hey man, why do you use invalid VAT numbers?`. Shhh. Quiet! Let's keep it a secret :)

As always, you can find the listed code in [Gaev.Blog.Examples.EnumParsePitfall](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.0.1/Gaev.Blog.Examples.EnumParsePitfall/ParsingEnumTests.cs).
