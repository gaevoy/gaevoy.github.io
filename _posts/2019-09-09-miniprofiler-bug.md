---
published: true
title: Story on how MiniProfiler 3 breaks TransactionScope flow
description: The story on how I spent a couple of days debugging apps to find out that MiniProfiler 3 breaks TransactionScope flow in certain conditions
layout: post
tags: [MiniProfiler, TransactionScope, AsyncPump, csharp, dotnet]
comments: true
---

Usually, while investigating some strange behavior I feel like I'm the detective Columbo and the murderer at the same time :)

> Debugging is like being the detective in a crime movie where you are also the murderer — [Filipe Fortes](https://twitter.com/fortes/status/399339918213652480){:target="_blank"}

This time, I noticed strange behavior on how `TransactionScope` flows. More interesting, it works differently across our applications. So the simple code below works strange - in some apps `Transaction.Current` is `null` as expected, in others it is not. As a result, we are getting inconsistent data in the database.

```c#
using (var tran = new TransactionScope())
{
    AsyncPump.Run(async () =>
    {
        await MakeDatabaseCall().ConfigureAwait(false);
        // Transaction.Current should be null here
    });
    tran.Complete();
}
```

`AsyncPump` is a small class written by [Stephen Toub from .NET team at Microsoft](https://devblogs.microsoft.com/pfxteam/await-synchronizationcontext-and-console-apps/){:target="_blank"}. `AsyncPump` helps to run `async` code right in synchronous methods, it makes sense mostly in legacy systems when refactoring is not an option.

Since `TransactionScope` does not receive `TransactionScopeAsyncFlowOption.Enabled` parameter to support `async`/`await` flow, `Transaction.Current` must be `null` after any `await`. Right? Of course! I thought this way but it turned out it is not always true.

`MakeDatabaseCall` is doing the simplest database call `select 1`.

```c#
private async Task MakeDatabaseCall()
{
    using (var con = CreateDbConnection())
    {
        await con.OpenAsync();
        var cmd = con.CreateCommand();
        cmd.CommandText = "select 1;";
        await cmd.ExecuteScalarAsync();
    }
}
```

In my specific case, `TransactionScope` should have supported `async`/`await` flow so I fixed this strange behavior by passing `TransactionScopeAsyncFlowOption.Enabled` parameter into `TransactionScope` to explicitly state my intention.

The issue is fixed but I still could not get rid of the thought why it worked differently. So I have spent a day debugging to understand who is the murderer. Eventually, the problem was found in a not expected place at all, it is `CreateDbConnection`.

```c#
private DbConnection CreateDbConnection()
{
    var connection = new SqlConnection("server=localhost;database=tempdb;UID=sa;PWD=***");
    if (_useMiniProfiler)
        return new ProfiledDbConnection(connection, MiniProfiler.Current);
    return connection;
}
```

Some of our apps use [MiniProfiler 3](https://www.nuget.org/packages/MiniProfiler/3.2.0.157){:target="_blank"} to measure SQL query durations, see more details in [How to alert on long-running SQL queries in .NET](/2019/01/29/alert-long-running-sql.html){:target="_blank"} article. `ProfiledDbConnection` wraps an instance of `SqlConnection` and breaks it violating [Liskov Substitution Principle](https://en.wikipedia.org/wiki/Liskov_substitution_principle){:target="_blank"}. However, `4+` version of `MiniProfiler` is OK and does not have such side effect. I would not call this is a bug because it appears in certain conditions: `TransactionScope` + `AsyncPump` + `ConfigureAwait(false)` + `MiniProfiler 3`. I hit the jackpot!

Finally, the murderer is found so I can sleep peacefully :)

I managed to reproduce the behavior difference in [MiniProfilerReproductionTests](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.6.0/Gaev.Blog.Examples.MiniProfiler3Bug/MiniProfilerReproductionTests.cs){:target="_blank"}. MiniProfiler GitHub issue is [here](https://github.com/MiniProfiler/dotnet/issues/419){:target="_blank"}.

<div style="width:60%;height:0;padding-bottom:53%;position:relative;margin:0 auto;"><iframe src="https://giphy.com/embed/ylyUQm2pCWo5yLfFEQ" width="100%" height="100%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p><a href="https://giphy.com/gifs/bad-ass-detective-columbo-ylyUQm2pCWo5yLfFEQ">via GIPHY</a></p>
