---
published: true
title: Review .NET dependencies on every commit
description: Why you should cover .NET project architecture rules by tests as soon as possible? How to keep dependencies under control via NUnit?
layout: post
tags: [dotnet, dotnet-core, csharp, NUnit, PlantUML]
comments: true
---

I want to share with you a sad story that would not have happened if I had known earlier how to review .NET dependencies automatically. I work with .NET app that has a lot of .NET Framework projects. However, they are slowly being migrated to .NET Standard to be able to move to .NET Core eventually. At some point, I made yet another migration of project and its dependencies to .NET Standard. Then after a while, know what?! I found out that the project has .NET Framework dependencies again. `(╯°□°)╯︵ ┻━┻` Of course, it passed a review we do manually and landed to `main` branch. With such success we will never move to .NET Core. How come?

## Problem

Modern IDE is such a convenient and smart editor that it can add a new dependency as you type. As a result, an undesirable dependency may show up, silently. Such changes may go through the review phase because, a review by human is not always reliable. Can this be automated?

## Solution

There is a way to test architecture and coding rules by tests. Such tests run on CI/CD server on every commit and fail the build (and therefore a review) once mistake is found. Check out these awesome libraries: [ArchUnitNET](https://github.com/TNG/ArchUnitNET), [NetArchTest](https://github.com/BenMorris/NetArchTest). It turned out they both do not support checking .NET assemblies and their dependencies. However, they both rely on [Mono.Cecil](https://www.mono-project.com/docs/tools+libraries/libraries/Mono.Cecil/) to analyze .NET DLLs.

Thanks to `Mono.Cecil` I managed to write a tiny wrapper to represent dependencies as a tree, so it is possible to drill down (and up). Checkout complete version of [DotNetAssembly](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.2.0/Gaev.Blog.Examples.ArchitectureTests/DotNetAssembly.cs).

```c#
public class DotNetAssembly
{
    public DotNetAssembly(AssemblyDefinition assembly)
        => MonoCecilAssembly = assembly;
    public AssemblyDefinition MonoCecilAssembly { get; }
    public HashSet<DotNetAssembly> Dependencies { get; } = new();
    public HashSet<DotNetAssembly> BackwardsDependencies { get; } = new();
}
```

* `MonoCecilAssembly` property of `AssemblyDefinition` type is part of `Mono.Cecil` where you can find the assembly details, for instance, an attribute like `TargetFrameworkAttribute`.
* `Dependencies` contains direct dependencies.
* `BackwardsDependencies` contains who references that assembly.

## Showcase

I prepared projects with dependencies for demo purpose.

![Demo projects](/img/arch-tests/demo-projects.svg "Demo projects" ){:style="max-width:600px; width:100%;" class="block-center"}

There are 3 components: `Alfa`, `Bravo`, `Charlie`.

`Shell` is an application host to boot and start-up the components, kind of :)

A component consist of 2 projects:
* contract (`Gaev.Alfa.Api`, `Gaev.Bravo.Api`, `Gaev.Charlie.Api`)
* implementation (`Gaev.Alfa`, `Gaev.Bravo`, `Gaev.Charlie`).

Now, let's see how my architecture requirements are covered by tests. I will skip the implementation details, feel free to [see final tests](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.2.0/Gaev.Blog.Examples.ArchitectureTests/ArchitectureTests.cs).

#### A project itself should be .NET Standard

```c#
[TestCaseSource(nameof(AppProjects))]
public void App_project_should_be_NetStandard(DotNetAssembly it)
    => it.IsDotNetStandard()
        .Should().BeTrue();
```

#### A project's dependencies should be .NET Standard

```c#
[TestCaseSource(nameof(AppProjects))]
public void App_project_should_have_NetStandard_dependencies_only(DotNetAssembly my)
    => my.Dependencies
        .Should().OnlyContain(e => e.IsDotNetStandard());
```

#### A contract should not have any dependencies

```c#
[TestCaseSource(nameof(Contracts))]
public void Contract_should_not_have_any_dependencies(DotNetAssembly contract)
    => contract.Dependencies
        .Should().OnlyContain(e => IsSystem(e));
```

#### An implementation should not reference other implementations

```c#
[TestCaseSource(nameof(Implementations))]
public void Implementation_should_not_reference_implementation(DotNetAssembly implementation)
    => implementation.Dependencies
        .Should().NotContain(e => IsImplementation(e));
```

#### An implementation should reference `Microsoft.Extensions.DependencyInjection`

```c#
[TestCaseSource(nameof(Implementations))]
public void Implementation_should_reference_DI(DotNetAssembly implementation)
    => implementation.Dependencies
        .Should().Contain(e => e.Name.StartsWith("Microsoft.Extensions.DependencyInjection"));
```

#### The tests output

```
Passed App_project_should_be_NetStandard(Gaev.Shell) [21 ms]
Passed App_project_should_be_NetStandard(Gaev.Alfa) [< 1 ms]
Passed App_project_should_be_NetStandard(Gaev.Alfa.Api) [1 ms]
Passed App_project_should_be_NetStandard(Gaev.Bravo) [< 1 ms]
Passed App_project_should_be_NetStandard(Gaev.Bravo.Api) [< 1 ms]
Passed App_project_should_be_NetStandard(Gaev.Charlie) [< 1 ms]
Passed App_project_should_be_NetStandard(Gaev.Charlie.Api) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Shell) [3 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Alfa) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Alfa.Api) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Bravo) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Bravo.Api) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Charlie) [< 1 ms]
Passed App_project_should_have_NetStandard_dependencies_only(Gaev.Charlie.Api) [< 1 ms]
Passed Contract_should_not_have_any_dependencies(Gaev.Alfa.Api) [< 1 ms]
Passed Contract_should_not_have_any_dependencies(Gaev.Bravo.Api) [< 1 ms]
Passed Contract_should_not_have_any_dependencies(Gaev.Charlie.Api) [< 1 ms]
Passed Implementation_should_not_reference_implementation(Gaev.Alfa) [< 1 ms]
Passed Implementation_should_not_reference_implementation(Gaev.Bravo) [< 1 ms]
Passed Implementation_should_not_reference_implementation(Gaev.Charlie) [< 1 ms]
Passed Implementation_should_reference_DI(Gaev.Alfa) [< 1 ms]
Passed Implementation_should_reference_DI(Gaev.Bravo) [< 1 ms]
Passed Implementation_should_reference_DI(Gaev.Charlie) [< 1 ms]
```

## Pitfalls

Keep in mind, .NET compiler optimizes dependencies so unused ones are removed from the resulting assembly. To overcome this in the tests I had to introduce dummy method. To sum up, when you add a reference without actual use it afterwards, you won't see the reference in the tests due to the optimization.

```c#
private void CompilerHint()
{
    _ = typeof(Shell.Bootstrap).Assembly;
}
```

I'm happy now, since few lines of code in the tests can define and keep architecture rules team should follow. In case of rule violation, this won't let you pass a review as it was before. A developer will see once PR is created and CI tests fail.

## Bonus

Thank you for reading to the very end. Wait a minute now, but there is one more thing I want to show you. You can render a package dependency diagram via [PlantUml](https://plantuml.com/) right like this.

```c#
[TestCaseSource(nameof(AppProjects))]
public void It_should_render_PlantUml_diagram(DotNetAssembly project)
{
    var plantUmlCode = project.RenderPlantUmlDiagram(IsMyApp);
    var svgDiagramUrl = new RendererFactory()
        .CreateRenderer()
        .RenderAsUri(plantUmlCode, OutputFormat.Svg);
    Console.WriteLine($"{svgDiagramUrl}\n{plantUmlCode}");
}
```

By the way, I rendered the showcase diagram above with the help of this test, [check it out](#showcase). The spirit of self-documented app is flying around :)

Source code: [demo projects](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.2.0/ArchitectureTestProjects), [tests and stuff](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.2.0/Gaev.Blog.Examples.ArchitectureTests).
