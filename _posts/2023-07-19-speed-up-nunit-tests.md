---
published: true
title: Speed up NUnit tests in one-line
description: NUnit defaults are not always optimal. Here is a one-line code change that can speed up NUnit tests by several times for free. However, there are pitfalls to be aware of. 
layout: post
tags: [dotnet, dotnet-core, csharp, NUnit]
comments: true
---

Nowadays, software developers use laptops with lots of CPU cores. The same on server frames - the number of CPUs grows. As a developer, I expect that the libraries I use are optimized to distribute workload across multiple CPU cores by default. But it is not the case for `NUnit` since, by default, it is terrible at running tests in parallel.

> `NUnit` is a unit-testing framework for all .Net languages. Initially ported from JUnit. It has been completely rewritten with many new features and support for a wide range of .NET platforms. — [nunit.org](https://nunit.org/){:target="_blank"}

In this article, I would like to share how one-line change can speed up your `NUnit` tests by several times.

## Problem

Let's imagine I have the following tests, where each test waits a second before completion. This way, we can check the total execution time to understand how `NUnit` distribute workload across multiple CPUs. I will be assigning test categories to run specific tests.

```c#
[Category("Default")]
public class Tests
{
    [Test]
    public Task Test1()
        => Task.Delay(1_000);

    [Test]
    public Task Test2()
        => Task.Delay(1_000);

    [Test]
    public Task Test3()
        => Task.Delay(1_000);

    [Test]
    public Task Test4()
        => Task.Delay(1_000);

    [Test]
    public Task Test5()
        => Task.Delay(1_000);
}
```

After running the tests.

```bash
dotnet test --filter:"Category=Default"
Duration: 5 s
```

It took 5 seconds, meaning it does not run the tests in parallel by default.

Let's check if it runs these tests in parallel to other tests. So I added the other test that waits 2 seconds.

```c#
[Category("Other")]
public class OtherTests
{
    [Test]
    public Task OtherTest()
        => Task.Delay(2_000);
}

```

Then run both test classes (fixtures).

```bash
dotnet test --filter:"Category=Default|Category=Other"
Duration: 7 s
```

It gives 7 seconds, meaning it does not run ANY tests in parallel by default.

To sum up, by default `NUnit` does not run tests in parallel. It may be good, because you don't have to think too much about shared-state concurrency, and terrible, because total time will bite you when there are thousands of unit tests.

> `Shared State Concurrency` is concurrency among two or more processes which have some shared state between them; which both processes can read to and write from — [wiki.c2.com](https://wiki.c2.com/?SharedStateConcurrency){:target="_blank"}

## Solution

In 2017 `NUnit` team has introduced [Parallelizable](https://docs.nunit.org/articles/nunit/writing-tests/attributes/parallelizable.html){:target="_blank"} feature that solves the problem. However, they have not changed default behaviour, obviously, to be backward compatible and not to break existing tests. To make use of the parallelizable feature, developers should explicitly enable it in tests.

I must remind you that tests should not use any shared state like database, singletons, static variables, disk drive. Keep default `NUnit` behaviour for tests using shared state.

I marked my tests with `Parallelizable` attribute hoping to enable parallelizable execution.

```c#
[Parallelizable, Category("Parallelizable")]
public class Tests
{
    [Test]
    public Task Test1()
        => Task.Delay(1_000);

    [Test]
    public Task Test2()
        => Task.Delay(1_000);

    [Test]
    public Task Test3()
        => Task.Delay(1_000);

    [Test]
    public Task Test4()
        => Task.Delay(1_000);

    [Test]
    public Task Test5()
        => Task.Delay(1_000);
}

[Parallelizable, Category("OtherParallelizable")]
public class OtherTests
{
    [Test]
    public Task OtherTest()
        => Task.Delay(2_000);
}
```

Then run the tests.

```bash
dotnet test --filter:"Category=Parallelizable"
Duration: 5 s
dotnet test --filter:"Category=Parallelizable|Category=OtherParallelizable"
Duration: 5 s
```

WAT?! The result is almost the same except it runs `Tests` and `OtherTests` in parallel. But tests within the same class (fixture) still don't run in parallel.

In order to run tests in the same class in parallel I have to use `Parallelizable(ParallelScope.All)`.

```c#
[Parallelizable(ParallelScope.All), Category("ParallelizableAll")]
public class Tests
{
    [Test]
    public Task Test1()
        => Task.Delay(1_000);

    [Test]
    public Task Test2()
        => Task.Delay(1_000);

    [Test]
    public Task Test3()
        => Task.Delay(1_000);

    [Test]
    public Task Test4()
        => Task.Delay(1_000);

    [Test]
    public Task Test5()
        => Task.Delay(1_000);
}
```

Let's perform testing.

```bash
dotnet test --filter:"Category=ParallelizableAll"
Duration: 1 s

dotnet test --filter:"Category=ParallelizableAll|Category=OtherParallelizable"
Duration: 2 s
```

Yeah, `Parallelizable(ParallelScope.All)` is what I was looking for! Here, even tests within the same class run in parallel. Also, other tests run in parallel to my tests.

Be carefully when a test uses `Setup`, `TearDown` and relies on state stored in the test class. `NUnit` reuses the same instance of test class between its tests which runs by concurrent threads. To fix this behaviour we have to apply [FixtureLifeCycle(LifeCycle.InstancePerTestCase)](https://docs.nunit.org/articles/nunit/writing-tests/attributes/fixturelifecycle.html){:target="_blank"} attribute. Let's jump to `Pitfalls` section for a moment to get a good understanding.

To sum up, `Parallelizable(ParallelScope.All)` and `FixtureLifeCycle(LifeCycle.InstancePerTestCase)` attributes signals `NUnit` to run tests in parallel. You can apply them to specific unit test classes (fixtures) or to whole test assembly adding the following lines. 

```c#
[assembly: Parallelizable(ParallelScope.All)]
[assembly: FixtureLifeCycle(LifeCycle.InstancePerTestCase)]
```

Enabling this for an assembly changes default behaviour, however it can be overridden for specific tests by adding `NonParallelizable` attribute for instance.

## Pitfalls

By default, `NUnit` reuses an instance of test class between its tests. Let's prove it.

```c#
[Parallelizable(ParallelScope.All), Category("ParallelizableAllPitfalls")]
public class Tests
{
    private int _state = 0;

    [SetUp]
    public void Setup()
        => WriteLine($"Setup State: {_state} Instance: {GetHashCode()}");

    [TearDown]
    public void TearDown()
        => WriteLine($"TearDown State: {_state} Instance: {GetHashCode()}");

    [Test]
    public Task Test1()
        => KindOfTest("Test1");

    [Test]
    public Task Test2()
        => KindOfTest("Test2");

    [Test]
    public Task Test3()
        => KindOfTest("Test3");

    [Test]
    public Task Test4()
        => KindOfTest("Test4");

    [Test]
    public Task Test5()
        => KindOfTest("Test5");

    private async Task KindOfTest(string testName)
    {
        var initial = _state;
        _state++;
        var changed = _state;
        await Task.Delay(1_000);
        WriteLine($"{testName} State: {initial}->{changed}->{_state} Instance: {GetHashCode()}");
    }
}
```

The `KindOfTest` method changes `_state` of test class and prints initial, changed and final value of `_state`. What do you think it will print?

```bash
dotnet test --filter:"Category=ParallelizableAllPitfalls"

01. Setup       State: 0        Instance: 10560058
07. Test5       State: 3->4->5  Instance: 10560058
13. TearDown    State: 5        Instance: 10560058

02. Setup       State: 0        Instance: 10560058
10. Test2       State: 0->1->5  Instance: 10560058
15. TearDown    State: 5        Instance: 10560058

05. Setup       State: 0        Instance: 10560058
08. Test3       State: 1->2->5  Instance: 10560058
14. TearDown    State: 5        Instance: 10560058

04. Setup       State: 0        Instance: 10560058
09. Test1       State: 4->5->5  Instance: 10560058
12. TearDown    State: 5        Instance: 10560058

03. Setup       State: 0        Instance: 10560058
06. Test4       State: 2->3->5  Instance: 10560058
11. TearDown    State: 5        Instance: 10560058
```

Instead of expected `0->1->1` there is concurrency issue due to reusing the same `_state` by the tests. To fix this we should apply [FixtureLifeCycle(LifeCycle.InstancePerTestCase)](https://docs.nunit.org/articles/nunit/writing-tests/attributes/fixturelifecycle.html){:target="_blank"} attribute, next to `Parallelizable`.

```bash
dotnet test --filter:"Category=ParallelizableAllPitfalls"

05. Setup       State: 0        Instance: 11865849
06. Test5       State: 0->1->1  Instance: 11865849
11. TearDown    State: 1        Instance: 11865849

04. Setup       State: 0        Instance: 52159047
09. Test1       State: 0->1->1  Instance: 52159047
15. TearDown    State: 1        Instance: 52159047

03. Setup       State: 0        Instance: 22460983
08. Test2       State: 0->1->1  Instance: 22460983
14. TearDown    State: 1        Instance: 22460983

02. Setup       State: 0        Instance: 44879274
07. Test3       State: 0->1->1  Instance: 44879274
13. TearDown    State: 1        Instance: 44879274

01. Setup       State: 0        Instance: 10560058
10. Test4       State: 0->1->1  Instance: 10560058
12. TearDown    State: 1        Instance: 10560058
```

The concurrency issue is gone now!

## Takeaways

* Make sure tests don't use shared state (database, singletons, static variables, disk drive).
* Mark tests which rely on shared state with `NonParallelizable` attribute.
* Enable `NUnit` parallelizable feature for whole assembly via: 
```c#
[assembly: Parallelizable(ParallelScope.All)]
[assembly: FixtureLifeCycle(LifeCycle.InstancePerTestCase)]
```
* Source code is [on Gaev.Blog.ParallelizableTests to play](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.4.0/Gaev.Blog.ParallelizableTests){:target="_blank"}.
