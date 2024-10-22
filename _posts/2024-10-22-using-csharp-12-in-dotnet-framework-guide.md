---
published: true
title: Using C# 12 Features in .NET Framework
description: Learn how to use C# 12 features in .NET Framework projects using PolySharp. A practical guide to modernizing legacy .NET applications without migration.
layout: post
tags: [dotnet, dotnet-core, csharp, polysharp]
comments: true
---

Ah, .NET Framework - our trusty old friend that refuses to retire! While it might be considered legacy, there are still tons of .NET Framework projects out there in the wild. And let's be honest, moving to the latest .NET isn't always a walk in the park, especially when your project is deeply married to Web Forms, WCF, or .NET Remoting.

![C# 12](/img/csharp/netfx-csharp-12.png "C#" ){:style="max-width:500px; width:100%;" class="block-center"}

So, while businesses stick to .NET Framework like a developer to their favorite IDE theme, we're stuck writing C# 7.3 code like it's 2017. But what if I told you we could smuggle C# 12 features into our .NET Framework projects? Spoiler alert: we can! 🎉

Here are some of the shiny C# 12 goodies we're about to unlock:
- Collection expressions (goodbye `new List<int> { 1, 2, 3 }`, hello `[1, 2, 3]`!)
- Primary constructors (because life's too short for boilerplate)
- Required members (enforce those configurations like a boss)
- Records (immutability for the win)
- Index and range operators (slicing arrays like a ninja)
- List patterns (pattern matching that doesn't make your eyes bleed)
- Optional parameters in lambda expressions (because sometimes we're lazy)
- ref readonly parameters (for when you care about performance)

## Problem

Let's start with a classic .NET Framework project. Nothing fancy, just your regular console app:

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net48</TargetFramework>
    </PropertyGroup>
</Project>
```

"Easy peasy!" you think, "I'll just add `LangVersion` and call it a day":

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net48</TargetFramework>
        <LangVersion>12</LangVersion>
    </PropertyGroup>
</Project>
```

Well... not so fast! Try using some C# 12 features and watch your build explode in a spectacular fashion. Here's what happens when you try to be too clever:

```csharp
public static class Program
{
    public static void Main(string[] args)
    {
        Console.WriteLine("Hello, World!"); // At least this works! 🎉

        ReadOnlySpan<int> numbers = [1, 2, 3, 4, 5, 6]; // Look ma, no new[]!
        // Index operator
        int secondToLast = numbers[^2];
        // Range operator, slicing arrays like butter
        var firstFour = numbers[..4];
        // List pattern matching, because we can!
        if (numbers is [_, 2, var third, .. var rest])
        {
        }
    }

    // Records, because classes are too mainstream
    public record Person(string FirstName, string LastName);

    // Required and init members, because forgetting configuration is not fun
    public class Config
    {
        public required string ConnectionString { get; init; }
    }
}
```

And then your build hits you with these errors:

```
Error CS0518 : Predefined type 'System.Runtime.CompilerServices.IsExternalInit' is not defined or imported
Error CS0656 : Missing compiler required member 'System.Runtime.CompilerServices.RequiredMemberAttribute..ctor'
Error CS0656 : Missing compiler required member 'System.Runtime.CompilerServices.CompilerFeatureRequiredAttribute..ctor'
```

What's going on? Well, it turns out that many C# language features introduced after C# 7.3 require special runtime types and attributes that are part of the compiler's runtime support. These types are not present in the .NET Framework's base class libraries. While setting `LangVersion` to 12 tells the compiler to accept C# 12 syntax, it doesn't provide the necessary runtime components. The .NET Framework predates these features, so it doesn't include these types in its standard libraries. Think of it this way: `LangVersion` is like giving the compiler permission to understand new C# syntax, but the runtime support types are like the actual machinery needed to make those features work at runtime. You need both parts for the features to function correctly.

## Solution

Enter `PolySharp` - the superhero NuGet package. The simplest way to fix these missing type errors. This library provides polyfills for modern C# language features, making them available in older frameworks like .NET Framework.

Add the following package reference to your project:

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net48</TargetFramework>
        <LangVersion>12</LangVersion>
    </PropertyGroup>
    <ItemGroup>
        <!-- PolySharp - the superhero that brings modern C# features to legacy frameworks -->
        <PackageReference Include="PolySharp" Version="1.14.1">
            <PrivateAssets>all</PrivateAssets>
            <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
        </PackageReference>
        
        <!-- For when you want to Span all the things -->
        <PackageReference Include="System.Memory" Version="4.5.4" />
    </ItemGroup>
</Project>
```

`PolySharp` is a source generator that automatically adds the missing compiler types to your project during build time. When you reference PolySharp:

1. It analyzes your project to determine which polyfills are needed
2. Generates the required type definitions (like IsExternalInit, RequiredMemberAttribute, etc.) as internal types in your assembly
3. Since these types are in special compiler-known namespaces, the C# compiler recognizes and uses them just like it would in modern .NET versions

The `<PrivateAssets>all</PrivateAssets>` setting ensures that `PolySharp` remains a development-time dependency and doesn't affect your project's public API or deployment. It ensures `PolySharp` stays behind the scenes - like a good ninja should!

With `PolySharp` installed, you can now use modern C# features like records, required members, collection expressions, and more in your .NET Framework projects. The previous code example will compile and run successfully.

Note: If you're planning to use `Span<T>` or `ReadOnlySpan<T>`, don't forget to invite their friend `System.Memory` package to the party.

### Compatibility Notes

Not all C# 12 features are purely syntactic sugar - some require runtime support, so test thoroughly!

## Useful Links

- [Source code](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.8.0/Gaev.Blog.CSharp12AndNetFramework) - complete working example
- [PolySharp](https://github.com/Sergio0694/PolySharp) - the library that makes the magic happen
- [What's new in C# 12](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-12) - official documentation about C# 12 features

## Conclusion

Even though .NET Framework is considered legacy, we can still enjoy modern C# features in our projects. By combining `LangVersion` setting with the `PolySharp` library, we get access to C# 12 features.

This approach helps teams that need to maintain .NET Framework applications to write more modern, expressive code without the immediate need to migrate to .NET Core/.NET.

You can find the complete working example in [Gaev.Blog.CSharp12AndNetFramework](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.8.0/Gaev.Blog.CSharp12AndNetFramework).

Have you tried using modern C# features in your .NET Framework projects? What's your experience with `PolySharp`? Feel free to share your thoughts and experiences in the comments below. Your feedback and suggestions are always welcome!
