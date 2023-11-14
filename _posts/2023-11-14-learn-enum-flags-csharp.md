---
published: true
title: A Comprehensive Guide to Mastering C# Enum Flags
description: Unlock the potential of Enum Flags in C# with our comprehensive guide. Learn how to simplify your code with the SetFlag method and understand bitwise operations.
layout: post
tags: [dotnet, dotnet-core, csharp, enum]
comments: true
---

Ever tried naming your favorite things using enums in C#/.NET, like choosing between `Dog`, `Cat`, or `Bird` for your favorite pet, or picking your top language from `English`, `German`, `Ukrainian`? Enums are fantastic for this - like a personal pick-n-mix of named values. But here's the twist: what if you're a multi-pet enthusiast or a polyglot? Do you resort to an array of enums? Nope, there's a cooler way - [enum flags](https://learn.microsoft.com/en-us/dotnet/api/system.flagsattribute).

Picture this enum:

```csharp
[Flags]
public enum Pet
{
    Dog =    0b_0001, // 1 - the loyal friend
    Cat =    0b_0010, // 2 - the whiskered boss
    Bird =   0b_0100, // 4 - the chirpy companion
    Rabbit = 0b_1000  // 8 - the fluffy hopper
}
```

Say I'm a cat and rabbit person. In enum flag land, my love for feline and fluffy equals `Pet.Cat | Pet.Rabbit`, which, by some magic, equals `10`. Hold that thought - we'll unravel this mystery soon!

```csharp
var myPreferences = Pet.Cat | Pet.Rabbit;
```

What if someone asks if I'm a dog lover?

```csharp
var isDogLover = myPreferences.HasFlag(Pet.Dog);
```

Spoiler alert: I'm not (at least for now).

![animals with flags](/img/learn-enum-flags-csharp/animals_with_flags.jpg "animals with flags" ){:style="max-width:500px; width:100%;" class="block-center"}

But wait, there's more! Imagine one day I'm all about Team Dog, and suddenly, rabbits just aren't my thing anymore (sorry, bunnies!). This is where things get really exciting! If you can play around with those bitwise operations and flip flags like a pro, then you're basically a code wizard! As for me, I'm just a bit forgetful. Sometimes I can't even remember if I chose cats or dogs (or was it birds?). So, writing this post is my way of keeping it all straight - and hopefully helping you too!

So, buckle up for an adventure in the land of enum flags, where we'll learn how to make our code as versatile as our changing preferences! 🐾🐱🐶🐰

## Problem

Ever scratched your head wondering why on Earth there's a `HasFlag` but no `SetFlag` in C#/.NET? Is it just me or is my autocomplete on a coffee break? How do you even set a flag without it?

### Raise a Flag

Imagine me, trying to be a code wizard, and I'm all for Team Cat.

```csharp
var myPreferences = Pet.Cat;
```

But then, one sunny day, I decide to join the fluffy rabbit fan club. Time for some `OR` bitwise magic!

```csharp
myPreferences = myPreferences | Pet.Rabbit;
```

Time for a bit of math (don't worry, it's not scary):

```
   0010 - Cat
OR
   1000 - Rabbit
   ----
   1010 - Cat + Rabbit
```

Ta-da! There's our `10`, which in the binary world is `1010`.

### Lower a Flag

Now, imagine a plot twist: I'm no longer a fan of the whiskered cat boss. It's time to say goodbye using `AND` and `NOT` bitwise operations.

```csharp
myPreferences = myPreferences & ~Pet.Cat;
```

Let's do the math (this one may be scary):

```
    1010 - Cat + Rabbit
AND
    1101 - NOT(Cat) which is NOT(0010)
    ----
    1000 - Rabbit
```

It's so easy to forget that little `~`, or mix up `&` with `|`, or even `&&` and `||`. Sometimes, I wonder why there isn't a handy `SetFlag` method yet. But hey, no worries – we're here to fix that!

## Solution

Drumroll, please! Introducing the hero we've all been waiting for the `SetFlag` method!

```csharp
using System.Linq.Expressions;

namespace Gaev.Blog.EnumFlags;

public static class EnumFlagExtensions
{
    public static TEnum SetFlag<TEnum>(this TEnum value, TEnum flag, bool state) where TEnum : Enum
    {
        var left = Convert.ToUInt64(value);
        var right = Convert.ToUInt64(flag);
        var result = state
            ? left | right
            : left & ~right;
        return (TEnum)Convert.ChangeType(result, Enum.GetUnderlyingType(typeof(TEnum)));
    }
}
```

But wait, hold your horses! Don't copy-paste just yet. Let's see this magic in action.

### Raise a Flag

```csharp
myPreferences = myPreferences.SetFlag(Pet.Rabbit, true);
```

Easy peasy, just like saying, "Yes, please, to bunnies!"

### Lower a Flag

```csharp
myPreferences = myPreferences.SetFlag(Pet.Cat, false);
```

Goodbye, cat – no more cat hairs on my keyboard!

See? No more losing that sneaky `~`.

The above code is cool, but some brainy folks suggested we could make it even faster by cutting out the boxing [here](https://stackoverflow.com/a/23391746). So, here's the turbo-charged version:

```csharp
using System.Linq.Expressions;

namespace Gaev.Blog.EnumFlags;

public static class EnumFlagExtensions
{
    public static TEnum SetFlag<TEnum>(this TEnum value, TEnum flag, bool state) where TEnum : Enum
    {
        var left = Caster<TEnum, UInt64>.Cast(value);
        var right = Caster<TEnum, UInt64>.Cast(flag);
        var result = state
            ? left | right
            : left & ~right;
        return Caster<ulong, TEnum>.Cast(result);
    }

    public static TEnum RaiseFlag<TEnum>(this TEnum value, TEnum flag) where TEnum : Enum
        => value.SetFlag(flag, true);

    public static TEnum LowerFlag<TEnum>(this TEnum value, TEnum flag) where TEnum : Enum
        => value.SetFlag(flag, false);

    private static class Caster<TSource, TTarget>
    {
        public static readonly Func<TSource, TTarget> Cast = CreateConvertMethod();

        private static Func<TSource, TTarget> CreateConvertMethod()
        {
            var p = Expression.Parameter(typeof(TSource));
            var c = Expression.ConvertChecked(p, typeof(TTarget));
            return Expression.Lambda<Func<TSource, TTarget>>(c, p).Compile();
        }
    }
}
```

Now, feel free to copy-paste!

And for the nerds among us (I proudly count myself as one), here's the performance report via `BenchmarkDotNet`:

| Method              | Runtime            | Mean        | Error     | StdDev    | Gen0   | Allocated |
|-------------------- |------------------- |------------:|----------:|----------:|-------:|----------:|
| RaiseFlag_Native    | .NET 7.0           |   0.3910 ns | 0.0194 ns | 0.0181 ns |      - |         - |
| RaiseFlag_NonBoxing | .NET 7.0           |   2.7012 ns | 0.0119 ns | 0.0111 ns |      - |         - |
| RaiseFlag_Boxing    | .NET 7.0           |  52.0814 ns | 0.6821 ns | 0.6380 ns | 0.0114 |     144 B |
| LowerFlag_Native    | .NET 7.0           |   0.4116 ns | 0.0109 ns | 0.0102 ns |      - |         - |
| LowerFlag_NonBoxing | .NET 7.0           |   2.6383 ns | 0.0146 ns | 0.0137 ns |      - |         - |
| LowerFlag_Boxing    | .NET 7.0           |  51.5234 ns | 0.3467 ns | 0.2895 ns | 0.0114 |     144 B |
| RaiseFlag_Native    | .NET Framework 4.8 |   0.3665 ns | 0.0234 ns | 0.0269 ns |      - |         - |
| RaiseFlag_NonBoxing | .NET Framework 4.8 |   3.5727 ns | 0.0178 ns | 0.0167 ns |      - |         - |
| RaiseFlag_Boxing    | .NET Framework 4.8 | 100.7910 ns | 0.2107 ns | 0.1759 ns | 0.0229 |     144 B |
| LowerFlag_Native    | .NET Framework 4.8 |   0.3292 ns | 0.0305 ns | 0.0327 ns |      - |         - |
| LowerFlag_NonBoxing | .NET Framework 4.8 |   3.8718 ns | 0.0203 ns | 0.0170 ns |      - |         - |
| LowerFlag_Boxing    | .NET Framework 4.8 | 103.2550 ns | 2.0824 ns | 2.3981 ns | 0.0229 |     144 B |

As you can see, our new `SetFlag` method is not just easy to use, but nearly as fast as the native bitwise operations! Quick, simple, and efficient.

## Frequently Asked Questions

### What are Enum Flags in C#/.NET?

Enum flags in C#/.NET allow you to store multiple values in a single enum variable using bitwise operations. This is useful when you need to represent a combination of options or preferences.

### How do I check if a specific flag is set?

Use the `HasFlag` method. For instance, `myPreferences.HasFlag(Pet.Dog)` checks if the dog flag is set in myPreferences.

### Is there a `SetFlag` method in C#/.NET?

No, there isn't a built-in `SetFlag` method in C#. However, you can implement one yourself to simplify setting and unsetting flags. The article provides an example implementation.

### Are there performance concerns with using the custom `SetFlag` method?

The custom `SetFlag` method is nearly as fast as native bitwise operations. Performance metrics are provided in the article for different .NET environments.

### Why is there no built-in `SetFlag` method in C#?

That's good question. The decision to exclude a `SetFlag` method from the standard library might be due to the simplicity of implementing it using existing bitwise operations. However, creating a custom `SetFlag` method can make the code more readable and maintainable.

## Conclusion

It looks like our autocomplete is finally back from its coffee break. That's a wrap on our fun-filled tour of enum flags in C#! With our nifty `SetFlag` method, you're all set to toggle your choices as easily as flipping a switch. No more bitwise headaches – just smooth, straightforward coding. Happy flag-raising (and lowering) adventures!

For those who love a deep dive, check out the [unit tests, examples, and benchmarks here](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.6.0/Gaev.Blog.EnumFlags).

If you enjoyed this coding caper, don't forget to share the magic with others! Drop a comment if you've got thoughts or tricks of your own to share, and follow me for more fun-filled coding adventures. Let's keep the flags of creativity and collaboration flying high! 
